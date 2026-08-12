# Project documentation

## Architecture

The repository contains a management layer under `OllamaManager/`, a browser frontend, Docker assets, an Nginx reverse proxy, and a Compose file for local orchestration. `.env.example` documents the configuration surface.

## Deployment flow

Copy `.env.example` to `.env`, review service ports and volumes, and start the stack with `docker compose up --build`. Verify the health of the management API, Ollama connectivity, frontend proxying, and model permissions before connecting external clients.

## Security checklist

Restrict the management interface to trusted networks, protect credentials, use an allowlist for upstream Ollama endpoints, review model download permissions, and avoid exposing Docker sockets or internal service ports unnecessarily.
