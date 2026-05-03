"""
Production settings — Render free tier, SQLite on /data, Redis on Upstash.
"""

from .base import *  # noqa: F401, F403
from decouple import config
import ssl

# ── Core ───────────────────────────────────────────────────────────────────────

DEBUG = False

SECRET_KEY = config("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = [
    config("RENDER_EXTERNAL_HOSTNAME", default=""),  # auto-injected by Render
    *config("ALLOWED_HOSTS", default="").split(","),  # any extra hosts you need
]
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS if h.strip()]

# ── Database — SQLite on persistent Render disk ────────────────────────────────
# Mount a 1 GB disk at /data in the Render dashboard (free tier supports one).
# Without the disk, /data is ephemeral and resets on every deploy.

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "/data/db.sqlite3",
    }
}

# ── Redis / Cache — Upstash TLS ────────────────────────────────────────────────
# Upstash URLs start with rediss:// (TLS). ssl_cert_reqs=CERT_NONE avoids
# hostname verification issues on Upstash's shared certs.

_REDIS_URL = config("REDIS_URL")  # rediss://default:<pass>@<host>.upstash.io:6379

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": _REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 10,          # keep low — Upstash free = 100 conn limit
                "ssl_cert_reqs": ssl.CERT_NONE,
            },
        },
        "KEY_PREFIX": "gitvis",
        "TIMEOUT": 300,
    }
}

# Sessions stay in Redis (inherited from base).

# ── Celery — Upstash TLS ───────────────────────────────────────────────────────

CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=_REDIS_URL)
CELERY_RESULT_BACKEND = config("CELERY_RESULT_BACKEND", default=_REDIS_URL)

# Override the base ssl dicts with explicit ssl constants
CELERY_BROKER_USE_SSL = {"ssl_cert_reqs": ssl.CERT_NONE}
CELERY_REDIS_BACKEND_USE_SSL = {"ssl_cert_reqs": ssl.CERT_NONE}

# ── CORS ───────────────────────────────────────────────────────────────────────

FRONTEND_URL = config("FRONTEND_URL")
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
# Methods, headers, and credentials are all inherited from base.

# ── Security headers ───────────────────────────────────────────────────────────
# Render terminates TLS at the edge — the Django app receives plain HTTP
# internally, so SECURE_SSL_REDIRECT must be OFF (Render enforces HTTPS itself).

SECURE_SSL_REDIRECT = False                 # DO NOT enable — breaks Render health checks
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True