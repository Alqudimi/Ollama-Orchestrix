"""Backup Service - Model and system backup management"""

import os
import uuid
import json
import shutil
import tarfile
from datetime import datetime
from typing import Optional
import asyncio

from ..core.config import settings
from ..models.schemas import BackupInfo
from .ollama_service import ollama_service
from .logging_service import logging_service


class BackupService:
    def __init__(self):
        self.backup_dir = settings.BACKUP_DIR
        self.backups: dict[str, BackupInfo] = {}
        self.lock = asyncio.Lock()
        os.makedirs(self.backup_dir, exist_ok=True)
        self._load_backup_history()
    
    def _load_backup_history(self):
        history_file = os.path.join(self.backup_dir, "backup_history.json")
        if os.path.exists(history_file):
            try:
                with open(history_file, "r") as f:
                    data = json.load(f)
                    for backup_data in data:
                        backup = BackupInfo(**backup_data)
                        self.backups[backup.id] = backup
            except Exception:
                pass
    
    def _save_backup_history(self):
        history_file = os.path.join(self.backup_dir, "backup_history.json")
        try:
            data = [
                {
                    "id": b.id,
                    "type": b.type,
                    "created_at": b.created_at.isoformat(),
                    "size": b.size,
                    "path": b.path,
                    "models": b.models,
                    "status": b.status
                }
                for b in self.backups.values()
            ]
            with open(history_file, "w") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass
    
    async def backup_models(
        self,
        models: Optional[list[str]] = None,
        include_metadata: bool = True
    ) -> BackupInfo:
        async with self.lock:
            backup_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"models_backup_{timestamp}.tar.gz"
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            try:
                all_models = await ollama_service.list_models()
                model_names = [m.get("name") for m in all_models]
                
                if models:
                    model_names = [m for m in model_names if m in models]
                
                backup_data = {
                    "backup_id": backup_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "models": []
                }
                
                for model_name in model_names:
                    try:
                        if include_metadata:
                            metadata = await ollama_service.get_model(model_name)
                            backup_data["models"].append({
                                "name": model_name,
                                "metadata": metadata
                            })
                        else:
                            backup_data["models"].append({"name": model_name})
                    except Exception as e:
                        await logging_service.log_system(
                            "warning",
                            f"Could not get metadata for model {model_name}: {e}"
                        )
                
                temp_dir = os.path.join(self.backup_dir, f"temp_{backup_id}")
                os.makedirs(temp_dir, exist_ok=True)
                
                manifest_path = os.path.join(temp_dir, "manifest.json")
                with open(manifest_path, "w") as f:
                    json.dump(backup_data, f, indent=2)
                
                with tarfile.open(backup_path, "w:gz") as tar:
                    tar.add(manifest_path, arcname="manifest.json")
                
                shutil.rmtree(temp_dir, ignore_errors=True)
                
                backup_size = os.path.getsize(backup_path)
                
                backup_info = BackupInfo(
                    id=backup_id,
                    type="models",
                    created_at=datetime.utcnow(),
                    size=backup_size,
                    path=backup_path,
                    models=model_names,
                    status="completed"
                )
                
                self.backups[backup_id] = backup_info
                self._save_backup_history()
                
                await logging_service.log_system(
                    "info",
                    f"Model backup created: {backup_id}",
                    {"models": model_names, "size": backup_size}
                )
                
                return backup_info
                
            except Exception as e:
                await logging_service.log_system(
                    "error",
                    f"Backup failed: {str(e)}"
                )
                raise
    
    async def backup_system(self) -> BackupInfo:
        async with self.lock:
            backup_id = str(uuid.uuid4())
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"system_backup_{timestamp}.tar.gz"
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            try:
                system_data = {
                    "backup_id": backup_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "type": "system",
                    "logs_dir": settings.LOG_DIR,
                    "config": {
                        "ollama_host": settings.OLLAMA_HOST,
                        "log_level": settings.LOG_LEVEL
                    }
                }
                
                temp_dir = os.path.join(self.backup_dir, f"temp_{backup_id}")
                os.makedirs(temp_dir, exist_ok=True)
                
                manifest_path = os.path.join(temp_dir, "manifest.json")
                with open(manifest_path, "w") as f:
                    json.dump(system_data, f, indent=2)
                
                with tarfile.open(backup_path, "w:gz") as tar:
                    tar.add(manifest_path, arcname="manifest.json")
                    
                    if os.path.exists(settings.LOG_DIR):
                        tar.add(settings.LOG_DIR, arcname="logs")
                
                shutil.rmtree(temp_dir, ignore_errors=True)
                
                backup_size = os.path.getsize(backup_path)
                
                backup_info = BackupInfo(
                    id=backup_id,
                    type="system",
                    created_at=datetime.utcnow(),
                    size=backup_size,
                    path=backup_path,
                    models=[],
                    status="completed"
                )
                
                self.backups[backup_id] = backup_info
                self._save_backup_history()
                
                await logging_service.log_system(
                    "info",
                    f"System backup created: {backup_id}",
                    {"size": backup_size}
                )
                
                return backup_info
                
            except Exception as e:
                await logging_service.log_system(
                    "error",
                    f"System backup failed: {str(e)}"
                )
                raise
    
    async def get_backup(self, backup_id: str) -> Optional[BackupInfo]:
        async with self.lock:
            return self.backups.get(backup_id)
    
    async def list_backups(
        self,
        backup_type: Optional[str] = None
    ) -> list[BackupInfo]:
        async with self.lock:
            backups = list(self.backups.values())
            
            if backup_type:
                backups = [b for b in backups if b.type == backup_type]
            
            return sorted(backups, key=lambda b: b.created_at, reverse=True)
    
    async def delete_backup(self, backup_id: str) -> bool:
        async with self.lock:
            backup = self.backups.get(backup_id)
            if not backup:
                return False
            
            try:
                if os.path.exists(backup.path):
                    os.remove(backup.path)
                
                del self.backups[backup_id]
                self._save_backup_history()
                
                await logging_service.log_system(
                    "info",
                    f"Backup deleted: {backup_id}"
                )
                
                return True
            except Exception as e:
                await logging_service.log_system(
                    "error",
                    f"Failed to delete backup {backup_id}: {str(e)}"
                )
                return False
    
    async def get_backup_content(self, backup_id: str) -> Optional[dict]:
        async with self.lock:
            backup = self.backups.get(backup_id)
            if not backup or not os.path.exists(backup.path):
                return None
            
            try:
                with tarfile.open(backup.path, "r:gz") as tar:
                    manifest_file = tar.extractfile("manifest.json")
                    if manifest_file:
                        return json.load(manifest_file)
            except Exception:
                return None
            
            return None


backup_service = BackupService()
