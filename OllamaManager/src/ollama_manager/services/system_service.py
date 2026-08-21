"""System Service - Resource monitoring and system repair"""

import os
import psutil
from datetime import datetime
from typing import Optional
import asyncio
import subprocess

from ..core.config import settings
from ..models.schemas import SystemResources, GPUInfo
from .logging_service import logging_service
from .cache_service import cache_service


class SystemService:
    def __init__(self):
        self.start_time = datetime.utcnow()
    
    async def get_cpu_info(self) -> dict:
        return {
            "percent": psutil.cpu_percent(interval=0.1),
            "count": psutil.cpu_count(),
            "count_logical": psutil.cpu_count(logical=True),
            "freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None,
            "per_cpu_percent": psutil.cpu_percent(interval=0.1, percpu=True)
        }
    
    async def get_memory_info(self) -> dict:
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return {
            "total": mem.total,
            "available": mem.available,
            "used": mem.used,
            "percent": mem.percent,
            "swap_total": swap.total,
            "swap_used": swap.used,
            "swap_percent": swap.percent
        }
    
    async def get_disk_info(self) -> dict:
        disk = psutil.disk_usage("/")
        return {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        }
    
    async def get_gpu_info(self) -> list[dict]:
        gpus = []
        try:
            import GPUtil
            gpu_list = GPUtil.getGPUs()
            for gpu in gpu_list:
                gpus.append({
                    "id": gpu.id,
                    "name": gpu.name,
                    "memory_total": int(gpu.memoryTotal * 1024 * 1024),
                    "memory_used": int(gpu.memoryUsed * 1024 * 1024),
                    "memory_free": int(gpu.memoryFree * 1024 * 1024),
                    "memory_percent": gpu.memoryUtil * 100,
                    "gpu_utilization": gpu.load * 100,
                    "temperature": gpu.temperature
                })
        except ImportError:
            pass
        except Exception as e:
            await logging_service.log_system(
                "warning",
                f"Could not get GPU info: {str(e)}"
            )
        
        return gpus
    
    async def get_ollama_processes(self) -> list[dict]:
        processes = []
        try:
            for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'cpu_percent', 'create_time']):
                try:
                    if 'ollama' in proc.info['name'].lower():
                        processes.append({
                            "pid": proc.info['pid'],
                            "name": proc.info['name'],
                            "memory_mb": proc.info['memory_info'].rss / (1024 * 1024) if proc.info['memory_info'] else 0,
                            "cpu_percent": proc.info['cpu_percent'],
                            "started": datetime.fromtimestamp(proc.info['create_time']).isoformat() if proc.info['create_time'] else None
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            await logging_service.log_system(
                "warning",
                f"Could not get Ollama processes: {str(e)}"
            )
        
        return processes
    
    async def get_system_resources(self) -> SystemResources:
        cpu = await self.get_cpu_info()
        mem = await self.get_memory_info()
        disk = await self.get_disk_info()
        
        return SystemResources(
            cpu_percent=cpu["percent"],
            cpu_count=cpu["count"],
            memory_total=mem["total"],
            memory_available=mem["available"],
            memory_used=mem["used"],
            memory_percent=mem["percent"],
            disk_total=disk["total"],
            disk_used=disk["used"],
            disk_free=disk["free"],
            disk_percent=disk["percent"]
        )
    
    async def get_uptime(self) -> float:
        delta = datetime.utcnow() - self.start_time
        return delta.total_seconds()
        
    async def get_health_status(self) -> dict:
        """Enhanced health check including Ollama status."""
        from .ollama_service import ollama_service
        
        ollama_health = await ollama_service.health_check()
        system_resources = await self.get_system_resources()
        
        status = "healthy"
        if not ollama_health.get("connected"):
            status = "degraded"
        
        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "ollama": ollama_health,
            "system": {
                "cpu_percent": system_resources.cpu_percent,
                "memory_percent": system_resources.memory_percent,
                "disk_percent": system_resources.disk_percent
            }
        }
    
    async def repair_system(self) -> dict:
        issues_found = 0
        issues_fixed = 0
        details = []
        
        try:
            if not os.path.exists(settings.LOG_DIR):
                os.makedirs(settings.LOG_DIR, exist_ok=True)
                issues_found += 1
                issues_fixed += 1
                details.append({
                    "issue": "Log directory missing",
                    "action": "Created log directory",
                    "status": "fixed"
                })
        except Exception as e:
            issues_found += 1
            details.append({
                "issue": "Log directory missing",
                "action": f"Failed to create: {str(e)}",
                "status": "failed"
            })
        
        try:
            if not os.path.exists(settings.BACKUP_DIR):
                os.makedirs(settings.BACKUP_DIR, exist_ok=True)
                issues_found += 1
                issues_fixed += 1
                details.append({
                    "issue": "Backup directory missing",
                    "action": "Created backup directory",
                    "status": "fixed"
                })
        except Exception as e:
            issues_found += 1
            details.append({
                "issue": "Backup directory missing",
                "action": f"Failed to create: {str(e)}",
                "status": "failed"
            })
        
        try:
            cleared = await cache_service.local_cache.cleanup_expired()
            if cleared > 0:
                issues_found += 1
                issues_fixed += 1
                details.append({
                    "issue": f"Found {cleared} expired cache entries",
                    "action": "Cleared expired entries",
                    "status": "fixed"
                })
        except Exception as e:
            details.append({
                "issue": "Cache cleanup",
                "action": f"Failed: {str(e)}",
                "status": "failed"
            })
        
        try:
            from .ollama_service import ollama_service
            health = await ollama_service.health_check()
            if not health.get("connected"):
                issues_found += 1
                details.append({
                    "issue": "Ollama connection failed",
                    "action": "Please ensure Ollama is running",
                    "status": "requires_attention"
                })
        except Exception as e:
            issues_found += 1
            details.append({
                "issue": "Ollama health check failed",
                "action": str(e),
                "status": "requires_attention"
            })
        
        await logging_service.log_system(
            "info",
            f"System repair completed: {issues_found} issues found, {issues_fixed} fixed",
            {"details": details}
        )
        
        return {
            "status": "completed",
            "issues_found": issues_found,
            "issues_fixed": issues_fixed,
            "details": details
        }
    
    async def rebuild_model_index(self) -> dict:
        try:
            from .ollama_service import ollama_service
            models = await ollama_service.list_models()
            
            await cache_service.clear_pattern("metadata:*")
            
            for model in models:
                model_name = model.get("name")
                if model_name:
                    try:
                        metadata = await ollama_service.get_model(model_name)
                        await cache_service.cache_model_metadata(model_name, metadata)
                    except Exception:
                        pass
            
            return {
                "status": "completed",
                "models_indexed": len(models)
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }


system_service = SystemService()
