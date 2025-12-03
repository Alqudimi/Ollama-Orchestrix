"""Metrics Router - Performance analytics endpoints"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Security, Query

from ..core.security import get_current_user, User
from ..services.metrics_service import metrics_service
from ..services.logging_service import logging_service
from ..models.responses import APIResponse, MetricsResponse

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("/model/{name:path}")
async def get_model_metrics(
    name: str,
    period: Optional[str] = Query(None, description="Time period: 1h, 24h, 7d, or all_time"),
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        metrics = await metrics_service.get_model_metrics(name, period)
        
        if not metrics:
            return APIResponse(
                success=True,
                message=f"No metrics found for model {name}",
                data={
                    "model_name": name,
                    "total_requests": 0,
                    "message": "No requests recorded yet"
                }
            )
        
        return APIResponse(
            success=True,
            message=f"Metrics for model {name}",
            data=metrics
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to get metrics for model {name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def get_all_metrics(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        all_metrics = await metrics_service.get_all_metrics()
        system_metrics = await metrics_service.get_system_metrics()
        
        return APIResponse(
            success=True,
            message=f"Metrics for {len(all_metrics)} models",
            data={
                "models": all_metrics,
                "system": system_metrics
            }
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to get all metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_metrics_summary(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        system_metrics = await metrics_service.get_system_metrics()
        
        return APIResponse(
            success=True,
            message="System metrics summary",
            data=system_metrics
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to get metrics summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/model/{name:path}")
async def clear_model_metrics(
    name: str,
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        cleared = await metrics_service.clear_metrics(name)
        
        if cleared == 0:
            return APIResponse(
                success=True,
                message=f"No metrics found for model {name}"
            )
        
        await logging_service.info(f"Cleared metrics for model: {name}")
        
        return APIResponse(
            success=True,
            message=f"Metrics cleared for model {name}"
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to clear metrics for model {name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
async def clear_all_metrics(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        cleared = await metrics_service.clear_metrics()
        
        await logging_service.info(f"Cleared metrics for {cleared} models")
        
        return APIResponse(
            success=True,
            message=f"Cleared metrics for {cleared} models"
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to clear all metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
