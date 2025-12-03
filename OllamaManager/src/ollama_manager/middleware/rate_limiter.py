"""Rate Limiting Middleware with Memory Management"""

import time
from collections import defaultdict
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import asyncio

from ..core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with automatic memory cleanup."""
    
    _instance: Optional["RateLimitMiddleware"] = None
    
    def __init__(
        self, 
        app, 
        requests_limit: Optional[int] = None, 
        period: Optional[int] = None,
        cleanup_interval: int = 300
    ):
        super().__init__(app)
        self.requests_limit = requests_limit if requests_limit is not None else settings.RATE_LIMIT_REQUESTS
        self.period = period if period is not None else settings.RATE_LIMIT_PERIOD
        self.cleanup_interval = cleanup_interval
        self.requests: dict[str, list[float]] = defaultdict(list)
        self.lock = asyncio.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
        self._last_cleanup = time.time()
        self._started = False
        RateLimitMiddleware._instance = self
    
    async def _periodic_cleanup(self) -> None:
        """Periodically clean up expired rate limit entries."""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception:
                pass
    
    async def _cleanup_expired(self) -> int:
        """Remove expired entries from memory."""
        async with self.lock:
            now = time.time()
            expired_ips = []
            
            for ip, timestamps in self.requests.items():
                valid_timestamps = [t for t in timestamps if now - t < self.period]
                if valid_timestamps:
                    self.requests[ip] = valid_timestamps
                else:
                    expired_ips.append(ip)
            
            for ip in expired_ips:
                del self.requests[ip]
            
            self._last_cleanup = now
            return len(expired_ips)
    
    def start_cleanup_task(self) -> None:
        """Start the background cleanup task."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
    
    def stop_cleanup_task(self) -> None:
        """Stop the background cleanup task."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
    
    async def get_stats(self) -> dict:
        """Get rate limiter statistics."""
        async with self.lock:
            return {
                "active_clients": len(self.requests),
                "total_tracked_requests": sum(len(r) for r in self.requests.values()),
                "last_cleanup": self._last_cleanup,
                "requests_limit": self.requests_limit,
                "period_seconds": self.period
            }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not self._started:
            self.start_cleanup_task()
            self._started = True
        
        if request.url.path in ["/docs", "/redoc", "/openapi.json", "/system/health", "/"]:
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        
        async with self.lock:
            now = time.time()
            
            self.requests[client_ip] = [
                t for t in self.requests[client_ip]
                if now - t < self.period
            ]
            
            if len(self.requests[client_ip]) >= self.requests_limit:
                retry_after = int(self.period - (now - self.requests[client_ip][0]))
                return Response(
                    content='{"error": "Rate limit exceeded", "retry_after": ' + str(retry_after) + '}',
                    status_code=429,
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(self.requests_limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(now + retry_after))
                    },
                    media_type="application/json"
                )
            
            self.requests[client_ip].append(now)
            remaining = self.requests_limit - len(self.requests[client_ip])
        
        response = await call_next(request)
        
        response.headers["X-RateLimit-Limit"] = str(self.requests_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + self.period))
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
