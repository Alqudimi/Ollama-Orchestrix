"""Application configuration settings with validation"""

import os
import warnings
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with validation and environment variable support."""
    
    APP_NAME: str = "Ollama Manager API"
    APP_VERSION: str = "1.1.0"
    APP_DESCRIPTION: str = "Advanced FastAPI Backend for Ollama Management"
    DEBUG: bool = False
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")
    
    OLLAMA_HOST: str = Field(default="http://localhost:11434", description="Ollama server URL")
    OLLAMA_TIMEOUT: int = Field(default=300, ge=10, le=3600, description="Request timeout in seconds")
    OLLAMA_MAX_RETRIES: int = Field(default=3, ge=1, le=10, description="Maximum retry attempts")
    
    SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv("SESSION_SECRET", "dev-secret-key-change-in-production"),
        description="JWT secret key"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, ge=5, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=30)
    
    REDIS_URL: Optional[str] = Field(default=None, description="Redis connection URL")
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = Field(default=300, ge=60, le=86400, description="Cache TTL in seconds")
    CACHE_MAX_SIZE: int = Field(default=1000, ge=100, le=100000, description="Maximum cache entries")
    
    RATE_LIMIT_REQUESTS: int = Field(default=100, ge=10, le=10000)
    RATE_LIMIT_PERIOD: int = Field(default=60, ge=10, le=3600)
    RATE_LIMIT_CLEANUP_INTERVAL: int = Field(default=300, ge=60, le=3600)
    
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_DIR: str = "logs"
    LOG_MAX_SIZE_MB: int = Field(default=10, ge=1, le=100)
    LOG_BACKUP_COUNT: int = Field(default=5, ge=1, le=20)
    
    BACKUP_DIR: str = "backups"
    BACKUP_MAX_COUNT: int = Field(default=10, ge=1, le=100)
    
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    MAX_REQUEST_SIZE_MB: int = Field(default=100, ge=1, le=1000)
    WORKERS: int = Field(default=1, ge=1, le=32)
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v = v.upper()
        if v not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of {valid_levels}")
        return v
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        valid_envs = ["development", "staging", "production"]
        v = v.lower()
        if v not in valid_envs:
            raise ValueError(f"ENVIRONMENT must be one of {valid_envs}")
        return v
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if "dev-secret-key" in v or len(v) < 32:
            warnings.warn(
                "Using default or weak SECRET_KEY. Set a strong key in production!",
                UserWarning
            )
        return v
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == "development"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
