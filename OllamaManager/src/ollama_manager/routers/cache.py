"""Cache Router - Cache management endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Security

from ..core.security import get_current_user, User
from ..services.cache_service import cache_service
from ..services.logging_service import logging_service
from ..models.responses import APIResponse

router = APIRouter(prefix="/cache", tags=["Cache"])


@router.get("/stats")
async def get_cache_stats(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        stats = await cache_service.get_stats()
        
        return APIResponse(
            success=True,
            message="Cache statistics",
            data=stats
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to get cache stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/clear")
async def clear_cache(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        cleared = await cache_service.clear_all()
        
        await logging_service.info(f"Cache cleared: {cleared} entries")
        
        return APIResponse(
            success=True,
            message=f"Cleared {cleared} cache entries"
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to clear cache: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/model/{name:path}")
async def clear_model_cache(
    name: str,
    current_user: User = Security(get_current_user, scopes=["model-manager"])
):
    try:
        await cache_service.invalidate_model_cache(name)
        
        await logging_service.info(f"Cache cleared for model: {name}")
        
        return APIResponse(
            success=True,
            message=f"Cache cleared for model {name}"
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to clear cache for model {name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup")
async def cleanup_expired_cache(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        cleaned = await cache_service.local_cache.cleanup_expired()
        
        await logging_service.info(f"Cleaned up {cleaned} expired cache entries")
        
        return APIResponse(
            success=True,
            message=f"Cleaned up {cleaned} expired cache entries"
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to cleanup cache: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
