# Ollama-Orchestrix

A full-stack platform for organizing and controlling Ollama systems. The repository contains a Python-oriented management layer, a frontend, Docker configuration, and Nginx configuration for serving the application.

## Requirements

For local development, install a recent Docker and Docker Compose release. If you run the components directly, also install the runtimes required by the files under `OllamaManager/` and `frontend/`.

## Run with Docker Compose

```bash
docker compose up --build
```

The exact exposed ports and service names are defined in `docker-compose.yml`. Stop the stack with `docker compose down`.

## Configuration

Copy `.env.example` to `.env` and review every setting before starting the stack:

```bash
cp .env.example .env
```

Do not commit real Ollama endpoints, tokens, passwords, or other secrets.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `OllamaManager/` | Ollama management functionality |
| `frontend/` | Browser interface |
| `docker/` | Container-related files |
| `nginx/` | Reverse-proxy configuration |
| `Makefile` | Convenience commands |
| `docker-compose.yml` | Local multi-service orchestration |

## Operational notes

Review network exposure, authentication, model download permissions, and container volume mappings before using the service outside a trusted development environment.
