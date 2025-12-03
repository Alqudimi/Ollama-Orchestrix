"""Embeddings Router - Generate embeddings from models"""

import time
from fastapi import APIRouter, Depends, HTTPException, Security

from ..core.security import get_current_user, User
from ..services.ollama_service import ollama_service
from ..services.metrics_service import metrics_service
from ..services.logging_service import logging_service
from ..models.requests import EmbeddingsRequest
from ..models.responses import APIResponse, EmbeddingsResponse

router = APIRouter(prefix="/embeddings", tags=["Embeddings"])


@router.post("")
async def generate_embeddings(
    request: EmbeddingsRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        start_time = time.time()
        
        input_text = request.input if request.input is not None else request.prompt
        
        if not input_text:
            raise HTTPException(
                status_code=400,
                detail="Either 'input' or 'prompt' must be provided"
            )
        
        await logging_service.info(
            f"Generating embeddings with model: {request.model}",
            model=request.model
        )
        
        response = await ollama_service.embeddings(
            model=request.model,
            input_text=input_text,
            options=request.options,
            keep_alive=request.keep_alive
        )
        
        end_time = time.time()
        
        await metrics_service.record_request(
            model_name=request.model,
            start_time=start_time,
            end_time=end_time,
            tokens_generated=0,
            prompt_tokens=response.get("prompt_eval_count", 0)
        )
        
        embeddings_data = response.get("embeddings", [])
        if not embeddings_data and "embedding" in response:
            embeddings_data = [response["embedding"]]
        
        return APIResponse(
            success=True,
            message=f"Generated {len(embeddings_data)} embedding(s)",
            data={
                "model": request.model,
                "embeddings": embeddings_data,
                "total_duration": response.get("total_duration"),
                "load_duration": response.get("load_duration"),
                "prompt_eval_count": response.get("prompt_eval_count")
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(
            f"Failed to generate embeddings with model {request.model}: {str(e)}",
            model=request.model
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def generate_batch_embeddings(
    model: str,
    texts: list[str],
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        start_time = time.time()
        
        await logging_service.info(
            f"Generating batch embeddings ({len(texts)} texts) with model: {model}",
            model=model
        )
        
        response = await ollama_service.embeddings(
            model=model,
            input_text=texts
        )
        
        end_time = time.time()
        
        await metrics_service.record_request(
            model_name=model,
            start_time=start_time,
            end_time=end_time,
            tokens_generated=0
        )
        
        embeddings_data = response.get("embeddings", [])
        
        return APIResponse(
            success=True,
            message=f"Generated {len(embeddings_data)} embeddings",
            data={
                "model": model,
                "embeddings": embeddings_data,
                "count": len(embeddings_data),
                "total_duration": response.get("total_duration")
            }
        )
        
    except Exception as e:
        await logging_service.error(
            f"Failed to generate batch embeddings: {str(e)}",
            model=model
        )
        raise HTTPException(status_code=500, detail=str(e))
