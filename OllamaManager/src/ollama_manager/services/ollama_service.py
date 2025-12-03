"""Ollama API Service - Core communication with Ollama"""

import httpx
import json
import asyncio
from typing import AsyncIterator, Optional, Any
from contextlib import asynccontextmanager

from ..core.config import settings
from ..models.schemas import ModelInfo, ModelDetails


class OllamaService:
    """Ollama API Service with connection pooling and retry support."""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_HOST
        self.timeout = settings.OLLAMA_TIMEOUT
        self._client: Optional[httpx.AsyncClient] = None
        self._lock = asyncio.Lock()
        self.max_retries = getattr(settings, 'OLLAMA_MAX_RETRIES', 3)
        self.retry_delay = 1.0
        self._active_tasks: set[asyncio.Task] = set()
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create a persistent HTTP client with connection pooling."""
        if self._client is None or self._client.is_closed:
            async with self._lock:
                if self._client is None or self._client.is_closed:
                    self._client = httpx.AsyncClient(
                        base_url=self.base_url,
                        timeout=httpx.Timeout(self.timeout, connect=10.0),
                        limits=httpx.Limits(
                            max_connections=100,
                            max_keepalive_connections=20,
                            keepalive_expiry=30.0
                        ),
                        http2=True
                    )
        return self._client
    
    async def close(self) -> None:
        """Close the HTTP client and release resources."""
        for task in self._active_tasks:
            if not task.done():
                task.cancel()
        
        if self._active_tasks:
            await asyncio.gather(*self._active_tasks, return_exceptions=True)
            self._active_tasks.clear()
        
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    @asynccontextmanager
    async def _get_streaming_client(self):
        """Get a fresh client for streaming operations."""
        client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout, connect=10.0),
            http2=True
        )
        try:
            yield client
        finally:
            await client.aclose()
    
    async def _request_with_retry(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> httpx.Response:
        """Execute request with automatic retry on transient failures."""
        client = await self._get_client()
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                response = await client.request(method, url, **kwargs)
                response.raise_for_status()
                return response
            except (httpx.ConnectError, httpx.ConnectTimeout) as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                continue
            except httpx.HTTPStatusError:
                raise
        
        raise last_exception
    
    async def health_check(self) -> dict:
        """Check Ollama server health status."""
        try:
            client = await self._get_client()
            response = await client.get("/")
            return {
                "connected": True,
                "status": response.status_code,
                "message": response.text
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }
    
    async def list_models(self) -> list[dict]:
        """List all available models."""
        response = await self._request_with_retry("GET", "/api/tags")
        data = response.json()
        return data.get("models", [])
    
    async def get_model(self, name: str) -> dict:
        """Get detailed information about a specific model."""
        response = await self._request_with_retry("POST", "/api/show", json={"name": name})
        return response.json()
    
    async def pull_model(self, name: str, insecure: bool = False) -> AsyncIterator[dict]:
        """Pull a model from registry with streaming progress."""
        async with self._get_streaming_client() as client:
            async with client.stream(
                "POST",
                "/api/pull",
                json={"name": name, "insecure": insecure, "stream": True}
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield json.loads(line)
    
    async def delete_model(self, name: str) -> bool:
        """Delete a model."""
        await self._request_with_retry("DELETE", "/api/delete", json={"name": name})
        return True
    
    async def create_model(
        self, 
        name: str, 
        modelfile: str,
        stream: bool = True
    ) -> AsyncIterator[dict]:
        """Create a new model from Modelfile."""
        async with self._get_streaming_client() as client:
            async with client.stream(
                "POST",
                "/api/create",
                json={"name": name, "modelfile": modelfile, "stream": stream}
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield json.loads(line)
    
    async def copy_model(self, source: str, destination: str) -> bool:
        """Copy a model to a new name."""
        await self._request_with_retry(
            "POST",
            "/api/copy",
            json={"source": source, "destination": destination}
        )
        return True
    
    async def push_model(self, name: str, insecure: bool = False) -> AsyncIterator[dict]:
        """Push a model to registry with streaming progress."""
        async with self._get_streaming_client() as client:
            async with client.stream(
                "POST",
                "/api/push",
                json={"name": name, "insecure": insecure, "stream": True}
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield json.loads(line)
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        template: Optional[str] = None,
        context: Optional[list[int]] = None,
        options: Optional[dict] = None,
        format: Optional[str] = None,
        keep_alive: str = "5m"
    ) -> dict:
        """Generate text from a prompt (non-streaming)."""
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": keep_alive
        }
        if system:
            payload["system"] = system
        if template:
            payload["template"] = template
        if context:
            payload["context"] = context
        if options:
            payload["options"] = options
        if format:
            payload["format"] = format
        
        response = await self._request_with_retry("POST", "/api/generate", json=payload)
        return response.json()
    
    async def generate_stream(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        template: Optional[str] = None,
        context: Optional[list[int]] = None,
        options: Optional[dict] = None,
        format: Optional[str] = None,
        keep_alive: str = "5m"
    ) -> AsyncIterator[dict]:
        """Generate text from a prompt with streaming."""
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": True,
            "keep_alive": keep_alive
        }
        if system:
            payload["system"] = system
        if template:
            payload["template"] = template
        if context:
            payload["context"] = context
        if options:
            payload["options"] = options
        if format:
            payload["format"] = format
        
        async with self._get_streaming_client() as client:
            async with client.stream("POST", "/api/generate", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield json.loads(line)
    
    async def chat(
        self,
        model: str,
        messages: list[dict],
        stream: bool = False,
        options: Optional[dict] = None,
        format: Optional[str] = None,
        keep_alive: str = "5m"
    ) -> dict:
        """Chat with a model (non-streaming)."""
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": stream,
            "keep_alive": keep_alive
        }
        if options:
            payload["options"] = options
        if format:
            payload["format"] = format
        
        response = await self._request_with_retry("POST", "/api/chat", json=payload)
        return response.json()
    
    async def chat_stream(
        self,
        model: str,
        messages: list[dict],
        options: Optional[dict] = None,
        format: Optional[str] = None,
        keep_alive: str = "5m"
    ) -> AsyncIterator[dict]:
        """Chat with a model with streaming."""
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
            "keep_alive": keep_alive
        }
        if options:
            payload["options"] = options
        if format:
            payload["format"] = format
        
        async with self._get_streaming_client() as client:
            async with client.stream("POST", "/api/chat", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield json.loads(line)
    
    async def embeddings(
        self,
        model: str,
        input_text: Any,
        options: Optional[dict] = None,
        keep_alive: str = "5m"
    ) -> dict:
        """Generate embeddings for text."""
        payload: dict[str, Any] = {
            "model": model,
            "input": input_text,
            "keep_alive": keep_alive
        }
        
        if options:
            payload["options"] = options
        
        response = await self._request_with_retry("POST", "/api/embed", json=payload)
        return response.json()
    
    async def list_running_models(self) -> list[dict]:
        """List currently running models."""
        response = await self._request_with_retry("GET", "/api/ps")
        data = response.json()
        return data.get("models", [])


ollama_service = OllamaService()
