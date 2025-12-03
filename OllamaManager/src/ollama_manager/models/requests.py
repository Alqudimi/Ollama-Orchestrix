"""Request models for API endpoints"""

from typing import Optional, Any
from pydantic import BaseModel, Field


class PullModelRequest(BaseModel):
    name: str = Field(..., description="Model name to pull (e.g., 'llama2', 'mistral')")
    insecure: bool = Field(default=False, description="Allow insecure connections")
    stream: bool = Field(default=True, description="Stream progress updates")


class CreateModelRequest(BaseModel):
    name: str = Field(..., description="Name for the new model")
    modelfile: str = Field(..., description="Modelfile content")
    stream: bool = Field(default=True, description="Stream progress updates")


class CopyModelRequest(BaseModel):
    source: str = Field(..., description="Source model name")
    destination: str = Field(..., description="Destination model name")


class PushModelRequest(BaseModel):
    name: str = Field(..., description="Model name to push")
    insecure: bool = Field(default=False, description="Allow insecure connections")
    stream: bool = Field(default=True, description="Stream progress updates")


class TagModelRequest(BaseModel):
    source: str = Field(..., description="Source model name")
    tag: str = Field(..., description="New tag name")


class RunRequest(BaseModel):
    model: str = Field(..., description="Model name to run")
    prompt: str = Field(..., description="Prompt text")
    system: Optional[str] = Field(default=None, description="System prompt")
    template: Optional[str] = Field(default=None, description="Prompt template")
    context: Optional[list[int]] = Field(default=None, description="Conversation context")
    options: Optional[dict] = Field(default=None, description="Model options (temperature, etc.)")
    format: Optional[str] = Field(default=None, description="Response format (e.g., 'json')")
    keep_alive: Optional[str] = Field(default="5m", description="Keep model loaded duration")


class ChatRequest(BaseModel):
    model: str = Field(..., description="Model name")
    messages: list[dict] = Field(..., description="Chat messages")
    stream: bool = Field(default=False, description="Stream response")
    options: Optional[dict] = Field(default=None, description="Model options")
    format: Optional[str] = Field(default=None, description="Response format")
    keep_alive: Optional[str] = Field(default="5m", description="Keep model loaded")


class EmbeddingsRequest(BaseModel):
    model: str = Field(..., description="Model name for embeddings")
    prompt: str = Field(default=None, description="Text to generate embeddings for (deprecated)")
    input: Optional[Any] = Field(default=None, description="Text or list of texts for embeddings")
    options: Optional[dict] = Field(default=None, description="Model options")
    keep_alive: Optional[str] = Field(default="5m", description="Keep model loaded")


class SessionStartRequest(BaseModel):
    model: str = Field(..., description="Model name for the session")
    system_prompt: Optional[str] = Field(default=None, description="System prompt")
    metadata: dict = Field(default={}, description="Session metadata")


class SessionMessageRequest(BaseModel):
    content: str = Field(..., description="Message content")
    stream: bool = Field(default=False, description="Stream response")
    options: Optional[dict] = Field(default=None, description="Model options")


class ModelfileValidateRequest(BaseModel):
    content: str = Field(..., description="Modelfile content to validate")


class ModelfileFormatRequest(BaseModel):
    content: str = Field(..., description="Modelfile content to format")


class ModelfilePreviewRequest(BaseModel):
    content: str = Field(..., description="Modelfile content to preview")


class BackupRequest(BaseModel):
    models: Optional[list[str]] = Field(default=None, description="Specific models to backup")
    include_metadata: bool = Field(default=True, description="Include model metadata")


class PipelineRequest(BaseModel):
    model: str = Field(..., description="Model to use")
    prompt: str = Field(..., description="Input prompt")
    generate_embeddings: bool = Field(default=False, description="Generate embeddings")
    pre_script: Optional[str] = Field(default=None, description="Pre-processing script")
    post_script: Optional[str] = Field(default=None, description="Post-processing script")
    options: Optional[dict] = Field(default=None, description="Model options")


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    email: Optional[str] = None
    full_name: Optional[str] = None
    scopes: list[str] = Field(default=["viewer"])
