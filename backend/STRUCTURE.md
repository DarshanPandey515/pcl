# Git Visualizer — Backend Structure

```
core/                   ← Django project root
  settings/
    base.py             ← shared settings
    development.py      ← dev overrides
    production.py       ← prod overrides
  urls.py
  wsgi.py
  asgi.py
  celery.py             ← Celery app

app/                    ← main Django app
  models.py             ← UserProfile + MomentumSnapshot
  serializers.py
  views.py
  urls.py
  admin.py

  services/
    github_service.py   ← GitHub REST + GraphQL client
    momentum.py         ← Momentum Score engine
    personality.py      ← Developer personality classifier
    narrative.py        ← Contribution timeline narrative builder
    burnout.py          ← Burnout / gap detection
    repo_health.py      ← Repository health + impact scoring
    cache.py            ← Redis cache helpers

  tasks/
    __init__.py
    sync.py             ← Celery tasks (daily/weekly sync)

requirements.txt
.env.example
```
