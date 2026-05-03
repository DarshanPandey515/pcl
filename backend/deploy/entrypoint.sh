#!/bin/sh
set -e

export DJANGO_SETTINGS_MODULE=core.settings.production

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Creating Celery Beat schedule tables..."
python manage.py migrate django_celery_beat --noinput || true

echo "==> Starting supervisor (gunicorn + celery worker + celery beat)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf