"""Response models for API endpoints"""

from datetime import datetime
from typing import Optional, Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
    code: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ModelListResponse(BaseModel):
    models: list[dict]
    count: int


class RunResponse(BaseModel):
    model: str
    response: str
    context: Optional[list[int]] = None
    total_duration: Optional[int] = None
    load_duration: Optional[int] = None
    prompt_eval_count: Optional[int] = None
    prompt_eval_duration: Optional[int] = None
    eval_count: Optional[int] = None
    eval_duration: Optional[int] = None
    done: bool = True


class StreamChunk(BaseModel):
    model: str
    response: str
    done: bool = False
    context: Optional[list[int]] = None
    total_duration: Optional[int] = None
    eval_count: Optional[int] = None


class EmbeddingsResponse(BaseModel):
    model: str
    embeddings: list[list[float]]
    total_duration: Optional[int] = None
    load_duration: Optional[int] = None
    prompt_eval_count: Optional[int] = None


class SessionResponse(BaseModel):
    id: str
    model: str
    created_at: datetime
    message_count: int


class ProcessResponse(BaseModel):
    id: str
    type: str
    status: str
    progress: float
    message: Optional[str] = None


class SystemResourcesResponse(BaseModel):
    cpu: dict
    memory: dict
    disk: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class GPUResourcesResponse(BaseModel):
    available: bool
    gpus: list[dict] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MetricsResponse(BaseModel):
    model_name: str
    total_requests: int
    total_tokens: int
    avg_latency_ms: float
    avg_tokens_per_sec: float
    period: str


class LogsResponse(BaseModel):
    entries: list[dict]
    total: int
    level_filter: Optional[str] = None


class BackupResponse(BaseModel):
    id: str
    type: str
    created_at: datetime
    size: int
    path: str
    models: list[str]


class HealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    version: Optional[str] = None
    uptime: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ModelfileValidationResponse(BaseModel):
    valid: bool
    errors: list[str] = []
    warnings: list[str] = []
    parsed: Optional[dict] = None


class RepairResponse(BaseModel):
    status: str
    issues_found: int
    issues_fixed: int
    details: list[dict] = []
