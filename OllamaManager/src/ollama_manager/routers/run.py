"""Run Router - Model execution with streaming support"""

import json
import time
from fastapi import APIRouter, Depends, HTTPException, Security, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from ..core.security import get_current_user, User
from ..services.ollama_service import ollama_service
from ..services.cache_service import cache_service
from ..services.metrics_service import metrics_service
from ..services.logging_service import logging_service
from ..models.requests import RunRequest, ChatRequest
from ..models.responses import APIResponse, RunResponse

router = APIRouter(prefix="/run", tags=["Run"])


@router.post("")
async def run_model(
    request: RunRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        start_time = time.time()
        
        cached = await cache_service.get_cached_generation(request.model, request.prompt)
        if cached:
            await logging_service.info(
                f"Cache hit for model {request.model}",
                model=request.model
            )
            return APIResponse(
                success=True,
                message="Generated response (cached)",
                data=cached
            )
        
        await logging_service.info(
            f"Running model: {request.model}",
            model=request.model,
            extra={"prompt_length": len(request.prompt)}
        )
        
        response = await ollama_service.generate(
            model=request.model,
            prompt=request.prompt,
            system=request.system,
            template=request.template,
            context=request.context,
            options=request.options,
            format=request.format,
            keep_alive=request.keep_alive
        )
        
        end_time = time.time()
        
        await cache_service.cache_generation(request.model, request.prompt, response)
        
        tokens_generated = response.get("eval_count", 0)
        await metrics_service.record_request(
            model_name=request.model,
            start_time=start_time,
            end_time=end_time,
            tokens_generated=tokens_generated,
            prompt_tokens=response.get("prompt_eval_count", 0)
        )
        
        return APIResponse(
            success=True,
            message="Generated response",
            data=response
        )
    except Exception as e:
        await logging_service.error(
            f"Failed to run model {request.model}: {str(e)}",
            model=request.model
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def run_model_stream(
    request: RunRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        start_time = time.time()
        
        await logging_service.info(
            f"Starting stream for model: {request.model}",
            model=request.model
        )
        
        async def generate():
            full_response = ""
            tokens_count = 0
            
            try:
                async for chunk in ollama_service.generate_stream(
                    model=request.model,
                    prompt=request.prompt,
                    system=request.system,
                    template=request.template,
                    context=request.context,
                    options=request.options,
                    format=request.format,
                    keep_alive=request.keep_alive
                ):
                    full_response += chunk.get("response", "")
                    if chunk.get("eval_count"):
                        tokens_count = chunk["eval_count"]
                    
                    yield {"data": json.dumps(chunk)}
                
                end_time = time.time()
                await metrics_service.record_request(
                    model_name=request.model,
                    start_time=start_time,
                    end_time=end_time,
                    tokens_generated=tokens_count
                )
                
            except Exception as e:
                yield {"data": json.dumps({"error": str(e)})}
        
        return EventSourceResponse(generate())
        
    except Exception as e:
        await logging_service.error(
            f"Failed to stream model {request.model}: {str(e)}",
            model=request.model
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat_with_model(
    request: ChatRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        start_time = time.time()
        
        await logging_service.info(
            f"Chat with model: {request.model}",
            model=request.model,
            extra={"message_count": len(request.messages)}
        )
        
        if request.stream:
            async def generate():
                full_response = ""
                try:
                    async for chunk in ollama_service.chat_stream(
                        model=request.model,
                        messages=request.messages,
                        options=request.options,
                        format=request.format,
                        keep_alive=request.keep_alive
                    ):
                        if "message" in chunk:
                            full_response += chunk["message"].get("content", "")
                        yield {"data": json.dumps(chunk)}
                    
                    end_time = time.time()
                    await metrics_service.record_request(
                        model_name=request.model,
                        start_time=start_time,
                        end_time=end_time,
                        tokens_generated=len(full_response.split())
                    )
                except Exception as e:
                    yield {"data": json.dumps({"error": str(e)})}
            
            return EventSourceResponse(generate())
        else:
            response = await ollama_service.chat(
                model=request.model,
                messages=request.messages,
                stream=False,
                options=request.options,
                format=request.format,
                keep_alive=request.keep_alive
            )
            
            end_time = time.time()
            await metrics_service.record_request(
                model_name=request.model,
                start_time=start_time,
                end_time=end_time,
                tokens_generated=response.get("eval_count", 0)
            )
            
            return APIResponse(
                success=True,
                message="Chat response",
                data=response
            )
            
    except Exception as e:
        await logging_service.error(
            f"Failed to chat with model {request.model}: {str(e)}",
            model=request.model
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/{model}")
async def websocket_run(
    websocket: WebSocket,
    model: str
):
    await websocket.accept()
    
    await logging_service.info(
        f"WebSocket connection opened for model: {model}",
        model=model
    )
    
    try:
        while True:
            data = await websocket.receive_json()
            prompt = data.get("prompt", "")
            options = data.get("options", {})
            system = data.get("system")
            
            start_time = time.time()
            full_response = ""
            tokens_count = 0
            
            try:
                async for chunk in ollama_service.generate_stream(
                    model=model,
                    prompt=prompt,
                    system=system,
                    options=options
                ):
                    full_response += chunk.get("response", "")
                    if chunk.get("eval_count"):
                        tokens_count = chunk["eval_count"]
                    
                    await websocket.send_json(chunk)
                
                end_time = time.time()
                await metrics_service.record_request(
                    model_name=model,
                    start_time=start_time,
                    end_time=end_time,
                    tokens_generated=tokens_count
                )
                
            except Exception as e:
                await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        await logging_service.info(
            f"WebSocket connection closed for model: {model}",
            model=model
        )
