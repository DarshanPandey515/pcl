FROM python:3.12-slim

# Install system deps + supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copy project
COPY . .

# SQLite data directory — Render free tier mounts a disk here if configured,
# otherwise it's ephemeral (acceptable for dev/demo use)
RUN mkdir -p /data && chmod 777 /data

# Supervisor config + entrypoint
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Collect static files (needs dummy vars at build time)
RUN DJANGO_SETTINGS_MODULE=core.settings.production \
    DJANGO_SECRET_KEY=build-placeholder \
    REDIS_URL=redis://localhost:6379 \
    SOCIAL_AUTH_GITHUB_CLIENT_ID=placeholder \
    SOCIAL_AUTH_GITHUB_SECRET=placeholder \
    FRONTEND_URL=http://localhost \
    python manage.py collectstatic --noinput

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]