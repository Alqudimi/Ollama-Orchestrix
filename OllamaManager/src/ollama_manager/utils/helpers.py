"""Helper utilities"""

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any, Optional


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime.
    
    This replaces deprecated datetime.utcnow() with timezone-aware alternative.
    """
    return datetime.now(timezone.utc)


def utc_now_isoformat() -> str:
    """Get current UTC time as ISO format string."""
    return utc_now().isoformat()


def generate_id(prefix: str = "") -> str:
    random_part = secrets.token_hex(8)
    timestamp_part = utc_now().strftime("%Y%m%d%H%M%S")
    if prefix:
        return f"{prefix}_{timestamp_part}_{random_part}"
    return f"{timestamp_part}_{random_part}"


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


def format_bytes(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} PB"


def format_duration(seconds: float) -> str:
    if seconds < 1:
        return f"{seconds * 1000:.2f}ms"
    elif seconds < 60:
        return f"{seconds:.2f}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = seconds % 60
        return f"{minutes}m {secs:.0f}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def safe_get(data: dict, *keys, default: Any = None) -> Any:
    for key in keys:
        if isinstance(data, dict):
            data = data.get(key, default)
        else:
            return default
    return data


def parse_model_name(full_name: str) -> tuple[str, Optional[str]]:
    if ":" in full_name:
        parts = full_name.split(":", 1)
        return parts[0], parts[1]
    return full_name, None


def tokens_to_words_estimate(token_count: int) -> int:
    return int(token_count * 0.75)


def sanitize_filename(filename: str) -> str:
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, "_")
    return filename


def deep_merge(base: dict, override: dict) -> dict:
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result
