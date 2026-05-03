import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")

app = Celery("gitvisualizer")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Explicitly pass app list so Celery discovers app/tasks/sync.py correctly on Windows
app.autodiscover_tasks(["app"])

# Suppress Celery 6.0 deprecation warning
app.conf.broker_connection_retry_on_startup = True


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")