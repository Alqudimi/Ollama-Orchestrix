"""Session Service - Manage conversation sessions"""

import uuid
from datetime import datetime
from typing import Optional, AsyncIterator
import asyncio

from ..models.schemas import Session, SessionMessage
from .ollama_service import ollama_service


class SessionService:
    def __init__(self):
        self.sessions: dict[str, Session] = {}
        self.lock = asyncio.Lock()
    
    async def create_session(
        self,
        model: str,
        system_prompt: Optional[str] = None,
        metadata: dict = None
    ) -> Session:
        async with self.lock:
            session_id = str(uuid.uuid4())
            
            session = Session(
                id=session_id,
                model=model,
                metadata=metadata or {}
            )
            
            if system_prompt:
                session.messages.append(SessionMessage(
                    role="system",
                    content=system_prompt
                ))
                session.metadata["system_prompt"] = system_prompt
            
            self.sessions[session_id] = session
            return session
    
    async def get_session(self, session_id: str) -> Optional[Session]:
        async with self.lock:
            return self.sessions.get(session_id)
    
    async def send_message(
        self,
        session_id: str,
        content: str,
        options: Optional[dict] = None
    ) -> dict:
        async with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            session.messages.append(SessionMessage(
                role="user",
                content=content
            ))
            session.updated_at = datetime.utcnow()
        
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in session.messages
        ]
        
        response = await ollama_service.chat(
            model=session.model,
            messages=messages,
            stream=False,
            options=options
        )
        
        assistant_message = response.get("message", {}).get("content", "")
        
        async with self.lock:
            session.messages.append(SessionMessage(
                role="assistant",
                content=assistant_message
            ))
            session.updated_at = datetime.utcnow()
        
        return {
            "session_id": session_id,
            "response": assistant_message,
            "model": session.model,
            "message_count": len(session.messages)
        }
    
    async def send_message_stream(
        self,
        session_id: str,
        content: str,
        options: Optional[dict] = None
    ) -> AsyncIterator[dict]:
        async with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            session.messages.append(SessionMessage(
                role="user",
                content=content
            ))
            session.updated_at = datetime.utcnow()
        
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in session.messages
        ]
        
        full_response = ""
        
        async for chunk in ollama_service.chat_stream(
            model=session.model,
            messages=messages,
            options=options
        ):
            if "message" in chunk:
                content_chunk = chunk["message"].get("content", "")
                full_response += content_chunk
                yield {
                    "session_id": session_id,
                    "chunk": content_chunk,
                    "done": chunk.get("done", False)
                }
        
        async with self.lock:
            session.messages.append(SessionMessage(
                role="assistant",
                content=full_response
            ))
            session.updated_at = datetime.utcnow()
    
    async def get_history(self, session_id: str) -> list[dict]:
        async with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            
            return [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in session.messages
            ]
    
    async def delete_session(self, session_id: str) -> bool:
        async with self.lock:
            if session_id in self.sessions:
                del self.sessions[session_id]
                return True
            return False
    
    async def list_sessions(self) -> list[dict]:
        async with self.lock:
            return [
                {
                    "id": session.id,
                    "model": session.model,
                    "created_at": session.created_at.isoformat(),
                    "updated_at": session.updated_at.isoformat(),
                    "message_count": len(session.messages)
                }
                for session in self.sessions.values()
            ]
    
    async def clear_session_history(self, session_id: str) -> bool:
        async with self.lock:
            session = self.sessions.get(session_id)
            if not session:
                return False
            
            system_messages = [
                msg for msg in session.messages 
                if msg.role == "system"
            ]
            session.messages = system_messages
            session.updated_at = datetime.utcnow()
            return True


session_service = SessionService()
