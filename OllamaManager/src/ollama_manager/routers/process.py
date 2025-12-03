"""Process Router - Background task management"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Security, Query

from ..core.security import get_current_user, User
from ..services.process_service import process_service
from ..services.logging_service import logging_service
from ..models.schemas import ProcessStatus, ProcessType
from ..models.responses import APIResponse

router = APIRouter(prefix="/process", tags=["Processes"])


@router.get("")
async def list_processes(
    status: Optional[str] = Query(None, description="Filter by status: pending, running, completed, failed, cancelled"),
    process_type: Optional[str] = Query(None, description="Filter by type: pull, push, create, copy, delete"),
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        status_filter = None
        type_filter = None
        
        if status:
            try:
                status_filter = ProcessStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        if process_type:
            try:
                type_filter = ProcessType(process_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid process type: {process_type}")
        
        processes = await process_service.list_processes(
            status=status_filter,
            process_type=type_filter
        )
        
        return APIResponse(
            success=True,
            message=f"Found {len(processes)} processes",
            data={
                "processes": [
                    {
                        "id": p.id,
                        "type": p.type.value,
                        "status": p.status.value,
                        "model_name": p.model_name,
                        "progress": p.progress,
                        "message": p.message,
                        "started_at": p.started_at.isoformat(),
                        "completed_at": p.completed_at.isoformat() if p.completed_at else None,
                        "error": p.error
                    }
                    for p in processes
                ],
                "count": len(processes)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to list processes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{process_id}")
async def get_process(
    process_id: str,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        process = await process_service.get_process(process_id)
        
        if not process:
            raise HTTPException(status_code=404, detail=f"Process {process_id} not found")
        
        return APIResponse(
            success=True,
            message=f"Process {process_id}",
            data={
                "id": process.id,
                "type": process.type.value,
                "status": process.status.value,
                "model_name": process.model_name,
                "progress": process.progress,
                "message": process.message,
                "started_at": process.started_at.isoformat(),
                "completed_at": process.completed_at.isoformat() if process.completed_at else None,
                "error": process.error
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to get process {process_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{process_id}/cancel")
async def cancel_process(
    process_id: str,
    current_user: User = Security(get_current_user, scopes=["model-manager"])
):
    try:
        cancelled = await process_service.cancel_process(process_id)
        
        if not cancelled:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel process {process_id}. It may not exist or is already completed."
            )
        
        return APIResponse(
            success=True,
            message=f"Process {process_id} cancelled"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to cancel process {process_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cleanup")
async def cleanup_completed_processes(
    max_age_hours: int = Query(24, ge=1, le=168, description="Clean up processes older than N hours"),
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        cleaned = await process_service.cleanup_completed(max_age_hours)
        
        return APIResponse(
            success=True,
            message=f"Cleaned up {cleaned} completed processes"
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to cleanup processes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
