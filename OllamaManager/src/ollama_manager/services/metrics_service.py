"""Metrics Service - Performance tracking and analytics"""

import time
from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict
import asyncio

from ..models.schemas import MetricsData
from ..utils.helpers import utc_now


class MetricsService:
    def __init__(self):
        self.metrics: dict[str, MetricsData] = {}
        self.request_history: dict[str, list] = defaultdict(list)
        self.lock = asyncio.Lock()
        self.max_history_size = 1000
    
    async def record_request(
        self,
        model_name: str,
        start_time: float,
        end_time: float,
        tokens_generated: int = 0,
        prompt_tokens: int = 0,
        success: bool = True,
        error: Optional[str] = None
    ) -> None:
        async with self.lock:
            latency_ms = (end_time - start_time) * 1000
            duration_sec = end_time - start_time
            tokens_per_sec = tokens_generated / duration_sec if duration_sec > 0 else 0
            
            if model_name not in self.metrics:
                self.metrics[model_name] = MetricsData(model_name=model_name)
            
            metrics = self.metrics[model_name]
            
            record = {
                "timestamp": utc_now().isoformat(),
                "latency_ms": latency_ms,
                "tokens_generated": tokens_generated,
                "prompt_tokens": prompt_tokens,
                "tokens_per_second": tokens_per_sec,
                "success": success,
                "error": error
            }
            
            self.request_history[model_name].append(record)
            
            if len(self.request_history[model_name]) > self.max_history_size:
                self.request_history[model_name] = self.request_history[model_name][-self.max_history_size:]
            
            metrics.total_requests += 1
            metrics.total_tokens_generated += tokens_generated
            metrics.last_used = utc_now()
            
            successful_requests = [r for r in self.request_history[model_name] if r["success"]]
            if successful_requests:
                latencies = [r["latency_ms"] for r in successful_requests]
                tokens_rates = [r["tokens_per_second"] for r in successful_requests if r["tokens_per_second"] > 0]
                
                metrics.average_latency_ms = sum(latencies) / len(latencies)
                metrics.min_latency_ms = min(latencies)
                metrics.max_latency_ms = max(latencies)
                
                if tokens_rates:
                    metrics.average_tokens_per_second = sum(tokens_rates) / len(tokens_rates)
    
    async def get_model_metrics(
        self, 
        model_name: str,
        period: Optional[str] = None
    ) -> Optional[dict]:
        async with self.lock:
            if model_name not in self.metrics:
                return None
            
            metrics = self.metrics[model_name]
            history = self.request_history[model_name]
            
            if period:
                now = utc_now()
                if period == "1h":
                    cutoff = now - timedelta(hours=1)
                elif period == "24h":
                    cutoff = now - timedelta(hours=24)
                elif period == "7d":
                    cutoff = now - timedelta(days=7)
                else:
                    cutoff = None
                
                if cutoff:
                    history = [
                        r for r in history 
                        if datetime.fromisoformat(r["timestamp"]) > cutoff
                    ]
            
            successful = [r for r in history if r["success"]]
            failed = [r for r in history if not r["success"]]
            
            return {
                "model_name": model_name,
                "total_requests": len(history),
                "successful_requests": len(successful),
                "failed_requests": len(failed),
                "success_rate": len(successful) / len(history) * 100 if history else 0,
                "total_tokens_generated": sum(r["tokens_generated"] for r in history),
                "average_latency_ms": sum(r["latency_ms"] for r in successful) / len(successful) if successful else 0,
                "min_latency_ms": min(r["latency_ms"] for r in successful) if successful else 0,
                "max_latency_ms": max(r["latency_ms"] for r in successful) if successful else 0,
                "average_tokens_per_second": sum(r["tokens_per_second"] for r in successful if r["tokens_per_second"] > 0) / len([r for r in successful if r["tokens_per_second"] > 0]) if any(r["tokens_per_second"] > 0 for r in successful) else 0,
                "last_used": metrics.last_used.isoformat() if metrics.last_used else None,
                "period": period or "all_time",
                "recent_requests": history[-10:]
            }
    
    async def get_all_metrics(self) -> dict:
        async with self.lock:
            result = {}
            for model_name in self.metrics:
                metrics = self.metrics[model_name]
                result[model_name] = {
                    "total_requests": metrics.total_requests,
                    "total_tokens": metrics.total_tokens_generated,
                    "avg_latency_ms": metrics.average_latency_ms,
                    "avg_tokens_per_sec": metrics.average_tokens_per_second,
                    "last_used": metrics.last_used.isoformat() if metrics.last_used else None
                }
            return result
    
    async def get_system_metrics(self) -> dict:
        async with self.lock:
            total_requests = sum(m.total_requests for m in self.metrics.values())
            total_tokens = sum(m.total_tokens_generated for m in self.metrics.values())
            
            all_latencies = []
            for history in self.request_history.values():
                all_latencies.extend([r["latency_ms"] for r in history if r["success"]])
            
            return {
                "total_models_used": len(self.metrics),
                "total_requests": total_requests,
                "total_tokens_generated": total_tokens,
                "average_latency_ms": sum(all_latencies) / len(all_latencies) if all_latencies else 0,
                "models": list(self.metrics.keys())
            }
    
    async def clear_metrics(self, model_name: Optional[str] = None) -> int:
        async with self.lock:
            if model_name:
                if model_name in self.metrics:
                    del self.metrics[model_name]
                    del self.request_history[model_name]
                    return 1
                return 0
            else:
                count = len(self.metrics)
                self.metrics.clear()
                self.request_history.clear()
                return count


metrics_service = MetricsService()
