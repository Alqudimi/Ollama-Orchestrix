"""Backup Router - Backup and restore operations"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Security, Query
from fastapi.responses import FileResponse

from ..core.security import get_current_user, User
from ..services.backup_service import backup_service
from ..services.logging_service import logging_service
from ..models.requests import BackupRequest
from ..models.responses import APIResponse

router = APIRouter(prefix="/backup", tags=["Backup"])


@router.post("/models")
async def backup_models(
    request: BackupRequest = None,
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        models = request.models if request else None
        include_metadata = request.include_metadata if request else True
        
        await logging_service.info("Starting model backup")
        
        backup_info = await backup_service.backup_models(
            models=models,
            include_metadata=include_metadata
        )
        
        return APIResponse(
            success=True,
            message=f"Backup created for {len(backup_info.models)} models",
            data={
                "id": backup_info.id,
                "type": backup_info.type,
                "created_at": backup_info.created_at.isoformat(),
                "size": backup_info.size,
                "size_human": _format_size(backup_info.size),
                "models": backup_info.models
            }
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to create backup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/system")
async def backup_system(
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        await logging_service.info("Starting system backup")
        
        backup_info = await backup_service.backup_system()
        
        return APIResponse(
            success=True,
            message="System backup created",
            data={
                "id": backup_info.id,
                "type": backup_info.type,
                "created_at": backup_info.created_at.isoformat(),
                "size": backup_info.size,
                "size_human": _format_size(backup_info.size)
            }
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to create system backup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_backup_history(
    backup_type: Optional[str] = Query(None, description="Filter by type: models or system"),
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        backups = await backup_service.list_backups(backup_type)
        
        return APIResponse(
            success=True,
            message=f"Found {len(backups)} backups",
            data={
                "backups": [
                    {
                        "id": b.id,
                        "type": b.type,
                        "created_at": b.created_at.isoformat(),
                        "size": b.size,
                        "size_human": _format_size(b.size),
                        "models": b.models,
                        "status": b.status
                    }
                    for b in backups
                ],
                "count": len(backups)
            }
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to get backup history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{backup_id}")
async def get_backup_details(
    backup_id: str,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        backup_info = await backup_service.get_backup(backup_id)
        
        if not backup_info:
            raise HTTPException(status_code=404, detail=f"Backup {backup_id} not found")
        
        content = await backup_service.get_backup_content(backup_id)
        
        return APIResponse(
            success=True,
            message=f"Backup {backup_id} details",
            data={
                "id": backup_info.id,
                "type": backup_info.type,
                "created_at": backup_info.created_at.isoformat(),
                "size": backup_info.size,
                "size_human": _format_size(backup_info.size),
                "models": backup_info.models,
                "status": backup_info.status,
                "content": content
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to get backup details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{backup_id}/download")
async def download_backup(
    backup_id: str,
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        backup_info = await backup_service.get_backup(backup_id)
        
        if not backup_info:
            raise HTTPException(status_code=404, detail=f"Backup {backup_id} not found")
        
        import os
        if not os.path.exists(backup_info.path):
            raise HTTPException(status_code=404, detail="Backup file not found on disk")
        
        return FileResponse(
            path=backup_info.path,
            filename=os.path.basename(backup_info.path),
            media_type="application/gzip"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to download backup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{backup_id}")
async def delete_backup(
    backup_id: str,
    current_user: User = Security(get_current_user, scopes=["admin"])
):
    try:
        deleted = await backup_service.delete_backup(backup_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Backup {backup_id} not found")
        
        return APIResponse(
            success=True,
            message=f"Backup {backup_id} deleted"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to delete backup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _format_size(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} PB"
