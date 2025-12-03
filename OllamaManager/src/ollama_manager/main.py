"""Main FastAPI Application - Ollama Manager API"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
import os
import signal
import asyncio
from typing import Optional

from .core.config import settings
from .middleware.rate_limiter import RateLimitMiddleware
from .middleware.logging import LoggingMiddleware
from .utils.exceptions import register_exception_handlers
from .services.logging_service import logging_service
from .services.ollama_service import ollama_service
from .services.cache_service import cache_service

from .routers import (
    auth_router,
    models_router,
    run_router,
    embeddings_router,
    sessions_router,
    system_router,
    metrics_router,
    logs_router,
    process_router,
    modelfile_router,
    backup_router,
    cache_router
)


_shutdown_event: Optional[asyncio.Event] = None


async def _graceful_shutdown():
    """Perform graceful shutdown of all services."""
    await logging_service.log_system("info", "Initiating graceful shutdown...")
    
    await ollama_service.close()
    
    if RateLimitMiddleware._instance:
        RateLimitMiddleware._instance.stop_cleanup_task()
    
    await cache_service.local_cache.cleanup_expired()
    
    await logging_service.log_system("info", "Graceful shutdown completed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with startup and shutdown logic."""
    global _shutdown_event
    _shutdown_event = asyncio.Event()
    
    os.makedirs(settings.LOG_DIR, exist_ok=True)
    os.makedirs(settings.BACKUP_DIR, exist_ok=True)
    
    await cache_service.initialize()
    
    await logging_service.log_system(
        "info",
        f"Ollama Manager API v{settings.APP_VERSION} starting...",
        extra={
            "ollama_host": settings.OLLAMA_HOST,
            "debug_mode": settings.DEBUG,
            "cache_enabled": settings.CACHE_ENABLED,
            "rate_limit": f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_PERIOD}s"
        }
    )
    
    yield
    
    await _graceful_shutdown()


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)


app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)


register_exception_handlers(app)


app.include_router(auth_router)
app.include_router(models_router)
app.include_router(run_router)
app.include_router(embeddings_router)
app.include_router(sessions_router)
app.include_router(system_router)
app.include_router(metrics_router)
app.include_router(logs_router)
app.include_router(process_router)
app.include_router(modelfile_router)
app.include_router(backup_router)
app.include_router(cache_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/system/health"
    }


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=f"""
## {settings.APP_DESCRIPTION}

### Features

- **Model Management**: List, pull, push, create, copy, delete models
- **Model Execution**: Run models with streaming support (SSE, WebSocket)
- **Embeddings**: Generate embeddings from any supported model
- **Session Management**: Manage conversation sessions with history
- **System Monitoring**: Monitor CPU, GPU, Memory, and Ollama processes
- **Performance Metrics**: Track latency, throughput, and tokens/sec
- **Advanced Logging**: Separate logs for each model and system
- **Background Tasks**: Manage long-running operations with progress tracking
- **Cache**: Smart caching for repeated requests
- **Backup & Restore**: Full backup and restore capabilities
- **Security**: OAuth2, Role-based access control, Rate limiting

### Authentication

This API uses OAuth2 with JWT tokens. To authenticate:

1. POST to `/auth/token` with username and password
2. Use the returned access token in the `Authorization` header: `Bearer <token>`

### Default Users

- **admin** / admin123 (full access)
- **manager** / manager123 (model management)
- **viewer** / viewer123 (read-only)

### Rate Limiting

- {settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_PERIOD} seconds
- Rate limit headers are included in all responses
        """,
        routes=app.routes,
    )
    
    openapi_schema["info"]["x-logo"] = {
        "url": "https://ollama.ai/public/ollama.png"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
