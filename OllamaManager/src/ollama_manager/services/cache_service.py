"""Cache Service - Smart caching for requests with Redis support"""

import hashlib
import json
from datetime import timedelta
from typing import Optional, Any
from collections import OrderedDict
import asyncio

from ..core.config import settings
from ..utils.helpers import utc_now


class LRUCache:
    def __init__(self, max_size: int = 1000):
        self.cache: OrderedDict = OrderedDict()
        self.max_size = max_size
        self.lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        async with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                if utc_now() < entry["expires_at"]:
                    self.cache.move_to_end(key)
                    entry["hit_count"] += 1
                    return entry["value"]
                else:
                    del self.cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl: int = None) -> None:
        if ttl is None:
            ttl = settings.CACHE_TTL
        
        async with self.lock:
            if len(self.cache) >= self.max_size:
                self.cache.popitem(last=False)
            
            self.cache[key] = {
                "value": value,
                "created_at": utc_now(),
                "expires_at": utc_now() + timedelta(seconds=ttl),
                "hit_count": 0
            }
    
    async def delete(self, key: str) -> bool:
        async with self.lock:
            if key in self.cache:
                del self.cache[key]
                return True
            return False
    
    async def clear(self) -> int:
        async with self.lock:
            count = len(self.cache)
            self.cache.clear()
            return count
    
    async def get_stats(self) -> dict:
        async with self.lock:
            total_hits = sum(entry["hit_count"] for entry in self.cache.values())
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "total_hits": total_hits,
                "entries": [
                    {
                        "key": key,
                        "created_at": entry["created_at"].isoformat(),
                        "expires_at": entry["expires_at"].isoformat(),
                        "hit_count": entry["hit_count"]
                    }
                    for key, entry in list(self.cache.items())[:50]
                ]
            }
    
    async def cleanup_expired(self) -> int:
        async with self.lock:
            now = utc_now()
            expired_keys = [
                key for key, entry in self.cache.items()
                if now >= entry["expires_at"]
            ]
            for key in expired_keys:
                del self.cache[key]
            return len(expired_keys)


class RedisCache:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client = None
        self._connected = False
    
    async def connect(self) -> bool:
        if self._connected:
            return True
        
        try:
            import redis.asyncio as redis
            self.client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.client.ping()
            self._connected = True
            return True
        except ImportError:
            return False
        except Exception:
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        if not self._connected:
            return None
        
        try:
            value = await self.client.get(key)
            if value:
                return json.loads(value)
        except Exception:
            pass
        return None
    
    async def set(self, key: str, value: Any, ttl: int = None) -> None:
        if not self._connected:
            return
        
        if ttl is None:
            ttl = settings.CACHE_TTL
        
        try:
            await self.client.setex(key, ttl, json.dumps(value))
        except Exception:
            pass
    
    async def delete(self, key: str) -> bool:
        if not self._connected:
            return False
        
        try:
            result = await self.client.delete(key)
            return result > 0
        except Exception:
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        if not self._connected:
            return 0
        
        try:
            keys = await self.client.keys(pattern)
            if keys:
                return await self.client.delete(*keys)
        except Exception:
            pass
        return 0
    
    async def clear_all(self) -> bool:
        if not self._connected:
            return False
        
        try:
            await self.client.flushdb()
            return True
        except Exception:
            return False
    
    async def get_info(self) -> dict:
        if not self._connected:
            return {"connected": False}
        
        try:
            info = await self.client.info("memory")
            return {
                "connected": True,
                "used_memory": info.get("used_memory_human"),
                "peak_memory": info.get("used_memory_peak_human"),
                "keys": await self.client.dbsize()
            }
        except Exception:
            return {"connected": False}


class CacheService:
    def __init__(self):
        self.enabled = settings.CACHE_ENABLED
        self.local_cache = LRUCache(max_size=1000)
        self.redis_cache: Optional[RedisCache] = None
        self._initialized = False
    
    async def initialize(self) -> None:
        if self._initialized:
            return
        
        if settings.REDIS_URL:
            self.redis_cache = RedisCache(settings.REDIS_URL)
            await self.redis_cache.connect()
        
        self._initialized = True
    
    def _generate_key(self, prefix: str, data: Any) -> str:
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        hash_val = hashlib.sha256(data_str.encode()).hexdigest()[:16]
        return f"{prefix}:{hash_val}"
    
    async def get(self, key: str) -> Optional[Any]:
        if not self.enabled:
            return None
        
        await self.initialize()
        
        if self.redis_cache and self.redis_cache._connected:
            result = await self.redis_cache.get(key)
            if result is not None:
                return result
        
        return await self.local_cache.get(key)
    
    async def set(self, key: str, value: Any, ttl: int = None) -> None:
        if not self.enabled:
            return
        
        await self.initialize()
        
        if ttl is None:
            ttl = settings.CACHE_TTL
        
        await self.local_cache.set(key, value, ttl)
        
        if self.redis_cache and self.redis_cache._connected:
            await self.redis_cache.set(key, value, ttl)
    
    async def delete(self, key: str) -> bool:
        await self.initialize()
        
        local_deleted = await self.local_cache.delete(key)
        
        redis_deleted = False
        if self.redis_cache and self.redis_cache._connected:
            redis_deleted = await self.redis_cache.delete(key)
        
        return local_deleted or redis_deleted
    
    async def clear_pattern(self, pattern: str) -> int:
        await self.initialize()
        
        count = 0
        if self.redis_cache and self.redis_cache._connected:
            count = await self.redis_cache.clear_pattern(pattern)
        
        return count
    
    async def clear_all(self) -> int:
        await self.initialize()
        
        count = await self.local_cache.clear()
        
        if self.redis_cache and self.redis_cache._connected:
            await self.redis_cache.clear_all()
        
        return count
    
    async def get_stats(self) -> dict:
        await self.initialize()
        
        stats = {
            "enabled": self.enabled,
            "backend": "local",
            "local_cache": await self.local_cache.get_stats()
        }
        
        if self.redis_cache:
            redis_info = await self.redis_cache.get_info()
            stats["redis"] = redis_info
            if redis_info.get("connected"):
                stats["backend"] = "redis+local"
        
        return stats
    
    async def cache_generation(self, model: str, prompt: str, response: dict) -> str:
        key = self._generate_key(f"gen:{model}", {"prompt": prompt})
        await self.set(key, response)
        return key
    
    async def get_cached_generation(self, model: str, prompt: str) -> Optional[dict]:
        key = self._generate_key(f"gen:{model}", {"prompt": prompt})
        return await self.get(key)
    
    async def cache_model_metadata(self, model_name: str, metadata: dict) -> str:
        key = f"metadata:{model_name}"
        await self.set(key, metadata, ttl=600)
        return key
    
    async def get_model_metadata(self, model_name: str) -> Optional[dict]:
        key = f"metadata:{model_name}"
        return await self.get(key)
    
    async def invalidate_model_cache(self, model_name: str) -> None:
        await self.delete(f"metadata:{model_name}")
        await self.clear_pattern(f"gen:{model_name}:*")


cache_service = CacheService()
