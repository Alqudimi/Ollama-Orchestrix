"""Core Pydantic schemas for Ollama Manager"""

from datetime import datetime, timezone
from typing import Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


def _utc_now() -> datetime:
    """Internal UTC now function for default_factory."""
    return datetime.now(timezone.utc)


class ModelStatus(str, Enum):
    AVAILABLE = "available"
    DOWNLOADING = "downloading"
    CREATING = "creating"
    PUSHING = "pushing"
    ERROR = "error"


class ProcessStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ProcessType(str, Enum):
    PULL = "pull"
    PUSH = "push"
    CREATE = "create"
    COPY = "copy"
    DELETE = "delete"


class ModelInfo(BaseModel):
    name: str
    modified_at: Optional[datetime] = None
    size: Optional[int] = None
    digest: Optional[str] = None
    details: Optional[dict] = None


class ModelDetails(BaseModel):
    name: str
    modified_at: Optional[datetime] = None
    size: Optional[int] = None
    digest: Optional[str] = None
    modelfile: Optional[str] = None
    parameters: Optional[str] = None
    template: Optional[str] = None
    system: Optional[str] = None
    license: Optional[str] = None
    details: Optional[dict] = None


class SessionMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str
    timestamp: datetime = Field(default_factory=_utc_now)


class Session(BaseModel):
    id: str
    model: str
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
    messages: list[SessionMessage] = []
    context: Optional[list[int]] = None
    metadata: dict = {}


class ProcessInfo(BaseModel):
    id: str
    type: ProcessType
    status: ProcessStatus
    model_name: str
    progress: float = 0.0
    message: Optional[str] = None
    started_at: datetime = Field(default_factory=_utc_now)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class MetricsData(BaseModel):
    model_name: str
    total_requests: int = 0
    total_tokens_generated: int = 0
    average_latency_ms: float = 0.0
    average_tokens_per_second: float = 0.0
    min_latency_ms: float = 0.0
    max_latency_ms: float = 0.0
    last_used: Optional[datetime] = None
    request_history: list[dict] = []


class SystemResources(BaseModel):
    cpu_percent: float
    cpu_count: int
    memory_total: int
    memory_available: int
    memory_used: int
    memory_percent: float
    disk_total: int
    disk_used: int
    disk_free: int
    disk_percent: float


class GPUInfo(BaseModel):
    id: int
    name: str
    memory_total: int
    memory_used: int
    memory_free: int
    memory_percent: float
    gpu_utilization: float
    temperature: Optional[float] = None


class LogEntry(BaseModel):
    timestamp: datetime
    level: str
    message: str
    model: Optional[str] = None
    extra: dict = {}


class BackupInfo(BaseModel):
    id: str
    type: str
    created_at: datetime
    size: int
    path: str
    models: list[str] = []
    status: str = "completed"


class CacheEntry(BaseModel):
    key: str
    value: Any
    created_at: datetime
    expires_at: datetime
    hit_count: int = 0
