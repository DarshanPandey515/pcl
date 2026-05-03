import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default handler to always return a consistent
    { error, details, status_code } shape.
    """
    response = exception_handler(exc, context)

    if response is not None:
        view = context.get("view")
        logger.warning(
            f"API error in {view.__class__.__name__ if view else 'unknown'}: "
            f"{exc.__class__.__name__}: {exc}"
        )
        error_data = {
            "error": _extract_message(response.data),
            "status_code": response.status_code,
        }
        response.data = error_data
        return response

    # Unhandled exception — return 500 with safe message
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return Response(
        {"error": "Internal server error", "status_code": 500},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _extract_message(data) -> str:
    if isinstance(data, str):
        return data
    if isinstance(data, dict):
        # DRF often returns {"detail": "..."} or {"field": ["..."]}
        if "detail" in data:
            return str(data["detail"])
        # Flatten field errors
        messages = []
        for key, val in data.items():
            if isinstance(val, list):
                messages.append(f"{key}: {', '.join(str(v) for v in val)}")
            else:
                messages.append(str(val))
        return "; ".join(messages)
    if isinstance(data, list):
        return "; ".join(str(v) for v in data)
    return str(data)
