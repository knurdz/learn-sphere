# Build context: repository root (see deploy/docker-compose.yml).
FROM python:3.11-slim-bookworm

WORKDIR /app/agent

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY agent/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY agent/agent.py ./

ENV PYTHONUNBUFFERED=1

CMD ["python", "agent.py", "start"]
