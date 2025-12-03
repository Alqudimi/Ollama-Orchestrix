"""Custom exception classes and handlers"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import traceback

from ..services.logging_service import logging_service
from .helpers import utc_now, utc_now_isoformat


class OllamaManagerException(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(self.message)


class OllamaConnectionError(OllamaManagerException):
    def __init__(self, message: str = "Failed to connect to Ollama"):
        super().__init__(message, "OLLAMA_CONNECTION_ERROR", 503)


class ModelNotFoundError(OllamaManagerException):
    def __init__(self, model_name: str):
        super().__init__(f"Model '{model_name}' not found", "MODEL_NOT_FOUND", 404)


class ModelOperationError(OllamaManagerException):
    def __init__(self, operation: str, model_name: str, detail: str = None):
        message = f"Failed to {operation} model '{model_name}'"
        if detail:
            message += f": {detail}"
        super().__init__(message, "MODEL_OPERATION_ERROR", 500)


class SessionNotFoundError(OllamaManagerException):
    def __init__(self, session_id: str):
        super().__init__(f"Session '{session_id}' not found", "SESSION_NOT_FOUND", 404)


class ProcessNotFoundError(OllamaManagerException):
    def __init__(self, process_id: str):
        super().__init__(f"Process '{process_id}' not found", "PROCESS_NOT_FOUND", 404)


class BackupNotFoundError(OllamaManagerException):
    def __init__(self, backup_id: str):
        super().__init__(f"Backup '{backup_id}' not found", "BACKUP_NOT_FOUND", 404)


class ValidationError(OllamaManagerException):
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR", 400)


class AuthenticationError(OllamaManagerException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTHENTICATION_ERROR", 401)


class AuthorizationError(OllamaManagerException):
    def __init__(self, message: str = "Not authorized to perform this action"):
        super().__init__(message, "AUTHORIZATION_ERROR", 403)


class RateLimitError(OllamaManagerException):
    def __init__(self, retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__(
            f"Rate limit exceeded. Try again in {retry_after} seconds",
            "RATE_LIMIT_EXCEEDED",
            429
        )


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(OllamaManagerException)
    async def ollama_manager_exception_handler(request: Request, exc: OllamaManagerException):
        await logging_service.log_system(
            "error",
            f"OllamaManagerException: {exc.message}",
            extra={"code": exc.code, "path": request.url.path}
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.message,
                "code": exc.code,
                "timestamp": utc_now_isoformat()
            }
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        await logging_service.log_system(
            "warning",
            f"HTTPException: {exc.detail}",
            extra={"status_code": exc.status_code, "path": request.url.path}
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.detail,
                "code": f"HTTP_{exc.status_code}",
                "timestamp": utc_now_isoformat()
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        error_id = utc_now().strftime("%Y%m%d%H%M%S")
        
        await logging_service.log_system(
            "error",
            f"Unhandled exception [{error_id}]: {str(exc)}",
            extra={
                "error_id": error_id,
                "path": request.url.path,
                "traceback": traceback.format_exc()
            }
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "An internal error occurred",
                "code": "INTERNAL_ERROR",
                "error_id": error_id,
                "detail": "Please contact support with the error ID for assistance",
                "timestamp": utc_now_isoformat()
            }
        )
