"""System Router - Resource monitoring and system management"""

from fastapi import APIRouter, Depends, HTTPException, Security

from ..core.security import get_current_user, User
from ..services.system_service import system_service
from ..services.ollama_service import ollama_service
from ..services.logging_service import logging_service
from ..models.responses import APIResponse, SystemResourcesResponse, GPUResourcesResponse, RepairResponse

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/health")
async def health_check():
    try:
        ollama_health = await ollama_service.health_check()
        uptime = await system_service.get_uptime()
        
        return APIResponse(
            success=True,
            message="System healthy",
            data={
                "status": "healthy",
                "ollama_connected": ollama_health.get("connected", False),
                "uptime_seconds": uptime
            }
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message="System unhealthy",
            data={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@router.get("/cpu")
async def get_cpu_info(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        cpu_info = await system_service.get_cpu_info()
        
        return APIResponse(
            success=True,
            message="CPU information",
            data=cpu_info
        )
    except Exception as e:
        await logging_service.error(f"Failed to get CPU info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/memory")
async def get_memory_info(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        memory_info = await system_service.get_memory_info()
        
        return APIResponse(
            success=True,
            message="Memory information",
            data=memory_info
        )
    except Exception as e:
        await logging_service.error(f"Failed to get memory info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gpu")
async def get_gpu_info(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        gpu_info = await system_service.get_gpu_info()
        
        return APIResponse(
            success=True,
            message=f"Found {len(gpu_info)} GPU(s)",
            data={
                "available": len(gpu_info) > 0,
                "gpus": gpu_info
            }
        )
    except Exception as e:
        await logging_service.error(f"Failed to get GPU info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/disk")
async def get_disk_info(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        disk_info = await system_service.get_disk_info()
        
        return APIResponse(
            success=True,
            message="Disk information",
            data=disk_info
        )
    except Exception as e:
        await logging_service.error(f"Failed to get disk info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resources")
async def get_system_resources(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        resources = await system_service.get_system_resources()
        gpu_info = await system_service.get_gpu_info()
        
        return APIResponse(
            success=True,
            message="System resources",
            data={
                "cpu": {
                    "percent": resources.cpu_percent,
                    "count": resources.cpu_count
                },
                "memory": {
                    "total": resources.memory_total,
                    "available": resources.memory_available,
                    "used": resources.memory_used,
                    "percent": resources.memory_percent
                },
                "disk": {
                    "total": resources.disk_total,
                    "used": resources.disk_used,
                    "free": resources.disk_free,
                    "percent": resources.disk_percent
                },
                "gpu": {
                    "available": len(gpu_info) > 0,
                    "count": len(gpu_info),
                    "devices": gpu_info
                }
            }
        )
    except Exception as e:
        await logging_service.error(f"Failed to get system resources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ollama-processes")
async def get_ollama_processes(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        processes = await system_service.get_ollama_processes()
        running_models = await ollama_service.list_running_models()
        
        return APIResponse(
            success=True,
            message=f"Found {len(processes)} Ollama process(es)",
            data={
                "processes": processes,
                "running_models": running_models
            }
        )
    except Exception as e:
        await logging_service.error(f"Failed to get Ollama processes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/repair")
async def repair_system(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        await logging_service.info("Starting system repair")
        
        result = await system_service.repair_system()
        
        return APIResponse(
            success=True,
            message=f"Repair completed: {result['issues_fixed']}/{result['issues_found']} issues fixed",
            data=result
        )
    except Exception as e:
        await logging_service.error(f"System repair failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rebuild-index")
async def rebuild_model_index(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        await logging_service.info("Rebuilding model index")
        
        result = await system_service.rebuild_model_index()
        
        return APIResponse(
            success=True,
            message=f"Index rebuilt for {result.get('models_indexed', 0)} models",
            data=result
        )
    except Exception as e:
        await logging_service.error(f"Failed to rebuild index: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
