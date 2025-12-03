"""Request Logging Middleware"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from ..services.logging_service import logging_service


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        
        request.state.request_id = request_id
        
        method = request.method
        path = request.url.path
        client_ip = self._get_client_ip(request)
        
        await logging_service.log_system(
            "debug",
            f"Request started: {method} {path}",
            extra={
                "request_id": request_id,
                "client_ip": client_ip,
                "user_agent": request.headers.get("user-agent", "unknown")
            }
        )
        
        try:
            response = await call_next(request)
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            
            await logging_service.log_system(
                "error",
                f"Request failed: {method} {path}",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                    "duration_ms": round(duration_ms, 2)
                }
            )
            raise
        
        duration_ms = (time.time() - start_time) * 1000
        
        log_level = "info"
        if response.status_code >= 500:
            log_level = "error"
        elif response.status_code >= 400:
            log_level = "warning"
        
        await logging_service.log_system(
            log_level,
            f"Request completed: {method} {path} -> {response.status_code}",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2)
            }
        )
        
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{round(duration_ms, 2)}ms"
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
