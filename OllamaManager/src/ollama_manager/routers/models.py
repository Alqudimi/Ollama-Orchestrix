"""Models Router - Model management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Security
from fastapi.responses import StreamingResponse
import json

from ..core.security import get_current_user, User
from ..services.ollama_service import ollama_service
from ..services.cache_service import cache_service
from ..services.logging_service import logging_service
from ..services.process_service import process_service
from ..models.schemas import ProcessType
from ..models.requests import (
    PullModelRequest,
    CreateModelRequest,
    CopyModelRequest,
    PushModelRequest,
    TagModelRequest
)
from ..models.responses import APIResponse, ModelListResponse

router = APIRouter(prefix="/models", tags=["Models"])


@router.get("")
async def list_models(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        models = await ollama_service.list_models()
        return APIResponse(
            success=True,
            message=f"Found {len(models)} models",
            data={"models": models, "count": len(models)}
        )
    except Exception as e:
        await logging_service.error(f"Failed to list models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{name:path}")
async def get_model(
    name: str,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        cached = await cache_service.get_model_metadata(name)
        if cached:
            return APIResponse(
                success=True,
                message=f"Model {name} details (cached)",
                data=cached
            )
        
        model_info = await ollama_service.get_model(name)
        await cache_service.cache_model_metadata(name, model_info)
        
        return APIResponse(
            success=True,
            message=f"Model {name} details",
            data=model_info
        )
    except Exception as e:
        await logging_service.error(f"Failed to get model {name}: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Model {name} not found")


@router.post("/pull")
async def pull_model(
    request: PullModelRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Security(get_current_user, scopes=["model-manager"])
):
    try:
        await logging_service.info(f"Starting pull for model: {request.name}")
        
        process = await process_service.create_process(
            ProcessType.PULL,
            request.name,
            f"Pulling model {request.name}"
        )
        
        if request.stream:
            async def stream_pull():
                try:
                    async for chunk in ollama_service.pull_model(request.name, request.insecure):
                        yield f"data: {json.dumps(chunk)}\n\n"
                        
                        if "completed" in chunk and "total" in chunk:
                            progress = (chunk["completed"] / chunk["total"]) * 100 if chunk["total"] > 0 else 0
                            await process_service.update_progress(process.id, progress, chunk.get("status", ""))
                    
                    await process_service.update_progress(process.id, 100, "Completed")
                    await cache_service.invalidate_model_cache(request.name)
                    yield f"data: {json.dumps({'done': True, 'process_id': process.id})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            return StreamingResponse(
                stream_pull(),
                media_type="text/event-stream"
            )
        else:
            async def do_pull():
                async for _ in ollama_service.pull_model(request.name, request.insecure):
                    pass
                await cache_service.invalidate_model_cache(request.name)
            
            await process_service.start_process(
                process.id,
                ollama_service.pull_model(request.name, request.insecure)
            )
            
            return APIResponse(
                success=True,
                message=f"Pull started for model {request.name}",
                data={"process_id": process.id}
            )
    except Exception as e:
        await logging_service.error(f"Failed to pull model {request.name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name:path}")
async def delete_model(
    name: str,
    current_user: User = Security(get_current_user, scopes=["model-manager"])
):
    try:
        await ollama_service.delete_model(name)
        await cache_service.invalidate_model_cache(name)
        await logging_service.info(f"Model deleted: {name}")
        
        return APIResponse(
            success=True,
            message=f"Model {name} deleted successfully"
        )
    except Exception as e:
        await logging_service.error(f"Failed to delete model {name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_model(
    request: CreateModelRequest,
    current_user: User = Security(get_current_user, scopes=["model-manager"])
):
    try:
        await logging_service.info(f"Creating model: {request.name}")
        
        process = await process_service.create_process(
            ProcessType.CREATE,
            request.name,
            f"Creating model {request.name}"
        )
        
        if request.stream:
            async def stream_create():
                try:
                    async for chunk in ollama_service.create_model(request.name, request.modelfile):
                        yield f"data: {json.dumps(chunk)}\n\n"
                    
                    await cache_service.invalidate_model_cache(request.name)
                    yield f"data: {json.dumps({'done': True, 'process_id': process.id})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            return StreamingResponse(
                stream_create(),
                media_type="text/event-stream"
            )
        else:
            await process_service.start_process(
                process.id,
                ollama_service.create_model(request.name, request.modelfile)
            )
            
            return APIResponse(
                success=True,
                message=f"Model creation started for {request.name}",
                data={"process_id": process.id}
            )
    except Exception as e:
        await logging_service.error(f"Failed to create model {request.name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/copy")
async def copy_model(
    request: CopyModelRequest,
    current_user: User = Security(get_current_user, scopes=["model-manager"])
):
    try:
        await ollama_service.copy_model(request.source, request.destination)
        await logging_service.info(f"Model copied: {request.source} -> {request.destination}")
        
        return APIResponse(
            success=True,
            message=f"Model {request.source} copied to {request.destination}"
        )
    except Exception as e:
        await logging_service.error(f"Failed to copy model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tag")
async def tag_model(
    request: TagModelRequest,
    current_user: User = Security(get_current_user, scopes=["model-manager"])
):
    try:
        destination = f"{request.source.split(':')[0]}:{request.tag}"
        await ollama_service.copy_model(request.source, destination)
        await logging_service.info(f"Model tagged: {request.source} -> {destination}")
        
        return APIResponse(
            success=True,
            message=f"Model {request.source} tagged as {request.tag}"
        )
    except Exception as e:
        await logging_service.error(f"Failed to tag model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/push")
async def push_model(
    request: PushModelRequest,
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        await logging_service.info(f"Pushing model: {request.name}")
        
        process = await process_service.create_process(
            ProcessType.PUSH,
            request.name,
            f"Pushing model {request.name}"
        )
        
        if request.stream:
            async def stream_push():
                try:
                    async for chunk in ollama_service.push_model(request.name, request.insecure):
                        yield f"data: {json.dumps(chunk)}\n\n"
                    
                    yield f"data: {json.dumps({'done': True, 'process_id': process.id})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
            return StreamingResponse(
                stream_push(),
                media_type="text/event-stream"
            )
        else:
            await process_service.start_process(
                process.id,
                ollama_service.push_model(request.name, request.insecure)
            )
            
            return APIResponse(
                success=True,
                message=f"Push started for model {request.name}",
                data={"process_id": process.id}
            )
    except Exception as e:
        await logging_service.error(f"Failed to push model {request.name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/running/list")
async def list_running_models(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        models = await ollama_service.list_running_models()
        return APIResponse(
            success=True,
            message=f"Found {len(models)} running models",
            data={"models": models, "count": len(models)}
        )
    except Exception as e:
        await logging_service.error(f"Failed to list running models: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
