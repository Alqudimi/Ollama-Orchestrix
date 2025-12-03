"""Process Service - Background task management"""

import uuid
from datetime import datetime
from typing import Optional, Callable, Any
import asyncio
from enum import Enum

from ..models.schemas import ProcessInfo, ProcessStatus, ProcessType
from .logging_service import logging_service


class ProcessService:
    def __init__(self):
        self.processes: dict[str, ProcessInfo] = {}
        self.tasks: dict[str, asyncio.Task] = {}
        self.lock = asyncio.Lock()
    
    async def create_process(
        self,
        process_type: ProcessType,
        model_name: str,
        message: str = None
    ) -> ProcessInfo:
        async with self.lock:
            process_id = str(uuid.uuid4())
            
            process = ProcessInfo(
                id=process_id,
                type=process_type,
                status=ProcessStatus.PENDING,
                model_name=model_name,
                message=message or f"Starting {process_type.value} for {model_name}"
            )
            
            self.processes[process_id] = process
            
            await logging_service.log_system(
                "info",
                f"Process created: {process_type.value} for {model_name}",
                {"process_id": process_id}
            )
            
            return process
    
    async def start_process(
        self,
        process_id: str,
        coroutine: Any
    ) -> None:
        async with self.lock:
            process = self.processes.get(process_id)
            if not process:
                raise ValueError(f"Process {process_id} not found")
            
            process.status = ProcessStatus.RUNNING
            
            task = asyncio.create_task(self._run_process(process_id, coroutine))
            self.tasks[process_id] = task
    
    async def _run_process(self, process_id: str, coroutine: Any) -> None:
        process = self.processes.get(process_id)
        if not process:
            return
        
        try:
            async for update in coroutine:
                async with self.lock:
                    if process.status == ProcessStatus.CANCELLED:
                        break
                    
                    if "status" in update:
                        process.message = update.get("status", "")
                    
                    if "completed" in update and "total" in update:
                        total = update["total"]
                        completed = update["completed"]
                        if total > 0:
                            process.progress = (completed / total) * 100
                    
                    if "digest" in update:
                        process.message = f"Processing: {update.get('digest', '')[:16]}..."
            
            async with self.lock:
                if process.status != ProcessStatus.CANCELLED:
                    process.status = ProcessStatus.COMPLETED
                    process.progress = 100.0
                    process.completed_at = datetime.utcnow()
                    process.message = "Completed successfully"
            
            await logging_service.log_system(
                "info",
                f"Process completed: {process.type.value} for {process.model_name}",
                {"process_id": process_id}
            )
            
        except asyncio.CancelledError:
            async with self.lock:
                process.status = ProcessStatus.CANCELLED
                process.completed_at = datetime.utcnow()
                process.message = "Process was cancelled"
            
        except Exception as e:
            async with self.lock:
                process.status = ProcessStatus.FAILED
                process.completed_at = datetime.utcnow()
                process.error = str(e)
                process.message = f"Failed: {str(e)}"
            
            await logging_service.log_system(
                "error",
                f"Process failed: {process.type.value} for {process.model_name}",
                {"process_id": process_id, "error": str(e)}
            )
    
    async def update_progress(
        self,
        process_id: str,
        progress: float,
        message: str = None
    ) -> None:
        async with self.lock:
            process = self.processes.get(process_id)
            if process:
                process.progress = progress
                if message:
                    process.message = message
    
    async def get_process(self, process_id: str) -> Optional[ProcessInfo]:
        async with self.lock:
            return self.processes.get(process_id)
    
    async def cancel_process(self, process_id: str) -> bool:
        async with self.lock:
            process = self.processes.get(process_id)
            if not process:
                return False
            
            if process.status not in [ProcessStatus.PENDING, ProcessStatus.RUNNING]:
                return False
            
            process.status = ProcessStatus.CANCELLED
            process.completed_at = datetime.utcnow()
            process.message = "Cancelled by user"
            
            if process_id in self.tasks:
                task = self.tasks[process_id]
                task.cancel()
                del self.tasks[process_id]
            
            await logging_service.log_system(
                "warning",
                f"Process cancelled: {process.type.value} for {process.model_name}",
                {"process_id": process_id}
            )
            
            return True
    
    async def list_processes(
        self,
        status: Optional[ProcessStatus] = None,
        process_type: Optional[ProcessType] = None
    ) -> list[ProcessInfo]:
        async with self.lock:
            processes = list(self.processes.values())
            
            if status:
                processes = [p for p in processes if p.status == status]
            
            if process_type:
                processes = [p for p in processes if p.type == process_type]
            
            return sorted(processes, key=lambda p: p.started_at, reverse=True)
    
    async def cleanup_completed(self, max_age_hours: int = 24) -> int:
        async with self.lock:
            cutoff = datetime.utcnow()
            from datetime import timedelta
            cutoff = cutoff - timedelta(hours=max_age_hours)
            
            to_remove = []
            for process_id, process in self.processes.items():
                if process.status in [ProcessStatus.COMPLETED, ProcessStatus.FAILED, ProcessStatus.CANCELLED]:
                    if process.completed_at and process.completed_at < cutoff:
                        to_remove.append(process_id)
            
            for process_id in to_remove:
                del self.processes[process_id]
                if process_id in self.tasks:
                    del self.tasks[process_id]
            
            return len(to_remove)


process_service = ProcessService()
