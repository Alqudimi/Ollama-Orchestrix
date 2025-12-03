"""Logging Service - Advanced logging system"""

import logging
import os
from datetime import datetime, timedelta
from typing import Optional
from collections import deque
import json
import asyncio

from ..core.config import settings
from ..utils.helpers import utc_now


class ModelLogger:
    def __init__(self, model_name: str, log_dir: str):
        self.model_name = model_name
        self.log_dir = log_dir
        self.logs: deque = deque(maxlen=1000)
        self.logger = self._setup_logger()
    
    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger(f"ollama.model.{self.model_name}")
        logger.setLevel(logging.DEBUG)
        
        os.makedirs(self.log_dir, exist_ok=True)
        
        file_handler = logging.FileHandler(
            os.path.join(self.log_dir, f"{self.model_name}.log")
        )
        file_handler.setLevel(logging.DEBUG)
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        if not logger.handlers:
            logger.addHandler(file_handler)
        
        return logger
    
    def log(self, level: str, message: str, extra: dict = None):
        entry = {
            "timestamp": utc_now().isoformat(),
            "level": level.upper(),
            "message": message,
            "model": self.model_name,
            "extra": extra or {}
        }
        self.logs.append(entry)
        
        log_func = getattr(self.logger, level.lower(), self.logger.info)
        if extra:
            log_func(f"{message} | {json.dumps(extra)}")
        else:
            log_func(message)
    
    def get_logs(
        self, 
        level: Optional[str] = None, 
        limit: int = 100,
        since: Optional[datetime] = None
    ) -> list[dict]:
        logs = list(self.logs)
        
        if level:
            logs = [l for l in logs if l["level"] == level.upper()]
        
        if since:
            logs = [l for l in logs if datetime.fromisoformat(l["timestamp"]) > since]
        
        return logs[-limit:]


class LoggingService:
    def __init__(self):
        self.log_dir = settings.LOG_DIR
        self.model_loggers: dict[str, ModelLogger] = {}
        self.system_logs: deque = deque(maxlen=5000)
        self.system_logger = self._setup_system_logger()
        self.lock = asyncio.Lock()
    
    def _setup_system_logger(self) -> logging.Logger:
        logger = logging.getLogger("ollama.system")
        logger.setLevel(logging.DEBUG)
        
        os.makedirs(self.log_dir, exist_ok=True)
        
        file_handler = logging.FileHandler(
            os.path.join(self.log_dir, "system.log")
        )
        file_handler.setLevel(logging.DEBUG)
        
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, settings.LOG_LEVEL))
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        if not logger.handlers:
            logger.addHandler(file_handler)
            logger.addHandler(console_handler)
        
        return logger
    
    def _get_model_logger(self, model_name: str) -> ModelLogger:
        if model_name not in self.model_loggers:
            model_log_dir = os.path.join(self.log_dir, "models")
            self.model_loggers[model_name] = ModelLogger(model_name, model_log_dir)
        return self.model_loggers[model_name]
    
    async def log_system(self, level: str, message: str, extra: dict = None):
        async with self.lock:
            entry = {
                "timestamp": utc_now().isoformat(),
                "level": level.upper(),
                "message": message,
                "extra": extra or {}
            }
            self.system_logs.append(entry)
            
            log_func = getattr(self.system_logger, level.lower(), self.system_logger.info)
            if extra:
                log_func(f"{message} | {json.dumps(extra)}")
            else:
                log_func(message)
    
    async def log_model(
        self, 
        model_name: str, 
        level: str, 
        message: str, 
        extra: dict = None
    ):
        async with self.lock:
            logger = self._get_model_logger(model_name)
            logger.log(level, message, extra)
    
    async def info(self, message: str, model: str = None, extra: dict = None):
        if model:
            await self.log_model(model, "info", message, extra)
        else:
            await self.log_system("info", message, extra)
    
    async def warning(self, message: str, model: str = None, extra: dict = None):
        if model:
            await self.log_model(model, "warning", message, extra)
        else:
            await self.log_system("warning", message, extra)
    
    async def error(self, message: str, model: str = None, extra: dict = None):
        if model:
            await self.log_model(model, "error", message, extra)
        else:
            await self.log_system("error", message, extra)
    
    async def debug(self, message: str, model: str = None, extra: dict = None):
        if model:
            await self.log_model(model, "debug", message, extra)
        else:
            await self.log_system("debug", message, extra)
    
    async def get_system_logs(
        self,
        level: Optional[str] = None,
        limit: int = 100,
        since: Optional[datetime] = None
    ) -> list[dict]:
        async with self.lock:
            logs = list(self.system_logs)
            
            if level:
                logs = [l for l in logs if l["level"] == level.upper()]
            
            if since:
                logs = [l for l in logs if datetime.fromisoformat(l["timestamp"]) > since]
            
            return logs[-limit:]
    
    async def get_model_logs(
        self,
        model_name: str,
        level: Optional[str] = None,
        limit: int = 100,
        since: Optional[datetime] = None
    ) -> list[dict]:
        async with self.lock:
            if model_name not in self.model_loggers:
                return []
            
            logger = self.model_loggers[model_name]
            return logger.get_logs(level, limit, since)
    
    async def get_all_model_names(self) -> list[str]:
        async with self.lock:
            return list(self.model_loggers.keys())
    
    async def clear_logs(self, model_name: Optional[str] = None) -> int:
        async with self.lock:
            if model_name:
                if model_name in self.model_loggers:
                    self.model_loggers[model_name].logs.clear()
                    return 1
                return 0
            else:
                count = len(self.model_loggers)
                for logger in self.model_loggers.values():
                    logger.logs.clear()
                self.system_logs.clear()
                return count + 1


logging_service = LoggingService()
