"""Logs Router - Log viewing and management"""

from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Security, Query

from ..core.security import get_current_user, User
from ..services.logging_service import logging_service
from ..models.responses import APIResponse, LogsResponse

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.get("/system")
async def get_system_logs(
    level: Optional[str] = Query(None, description="Filter by log level: DEBUG, INFO, WARNING, ERROR"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    since_hours: Optional[int] = Query(None, description="Logs from last N hours"),
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        since = None
        if since_hours:
            since = datetime.utcnow() - timedelta(hours=since_hours)
        
        logs = await logging_service.get_system_logs(
            level=level,
            limit=limit,
            since=since
        )
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(logs)} system logs",
            data={
                "entries": logs,
                "total": len(logs),
                "level_filter": level
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model/{name:path}")
async def get_model_logs(
    name: str,
    level: Optional[str] = Query(None, description="Filter by log level"),
    limit: int = Query(100, ge=1, le=1000),
    since_hours: Optional[int] = Query(None),
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        since = None
        if since_hours:
            since = datetime.utcnow() - timedelta(hours=since_hours)
        
        logs = await logging_service.get_model_logs(
            model_name=name,
            level=level,
            limit=limit,
            since=since
        )
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(logs)} logs for model {name}",
            data={
                "model": name,
                "entries": logs,
                "total": len(logs),
                "level_filter": level
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models")
async def list_logged_models(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        model_names = await logging_service.get_all_model_names()
        
        return APIResponse(
            success=True,
            message=f"Found {len(model_names)} models with logs",
            data={"models": model_names}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/model/{name:path}")
async def clear_model_logs(
    name: str,
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        cleared = await logging_service.clear_logs(name)
        
        return APIResponse(
            success=True,
            message=f"Logs cleared for model {name}" if cleared else f"No logs found for model {name}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/system")
async def clear_system_logs(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        await logging_service.clear_logs()
        
        return APIResponse(
            success=True,
            message="System logs cleared"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
async def clear_all_logs(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        cleared = await logging_service.clear_logs()
        
        return APIResponse(
            success=True,
            message=f"Cleared logs for {cleared} sources"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
