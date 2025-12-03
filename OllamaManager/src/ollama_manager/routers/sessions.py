"""Sessions Router - Conversation session management"""

import json
from fastapi import APIRouter, Depends, HTTPException, Security
from sse_starlette.sse import EventSourceResponse

from ..core.security import get_current_user, User
from ..services.session_service import session_service
from ..services.logging_service import logging_service
from ..models.requests import SessionStartRequest, SessionMessageRequest
from ..models.responses import APIResponse

router = APIRouter(prefix="/session", tags=["Sessions"])


@router.post("/start")
async def start_session(
    request: SessionStartRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        session = await session_service.create_session(
            model=request.model,
            system_prompt=request.system_prompt,
            metadata=request.metadata
        )
        
        await logging_service.info(
            f"Session started: {session.id}",
            model=request.model,
            extra={"session_id": session.id}
        )
        
        return APIResponse(
            success=True,
            message="Session created successfully",
            data={
                "id": session.id,
                "model": session.model,
                "created_at": session.created_at.isoformat()
            }
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to start session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/send")
async def send_message(
    session_id: str,
    request: SessionMessageRequest,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        if request.stream:
            async def generate():
                try:
                    async for chunk in session_service.send_message_stream(
                        session_id=session_id,
                        content=request.content,
                        options=request.options
                    ):
                        yield {"data": json.dumps(chunk)}
                except ValueError as e:
                    yield {"data": json.dumps({"error": str(e)})}
                except Exception as e:
                    yield {"data": json.dumps({"error": str(e)})}
            
            return EventSourceResponse(generate())
        else:
            response = await session_service.send_message(
                session_id=session_id,
                content=request.content,
                options=request.options
            )
            
            return APIResponse(
                success=True,
                message="Message sent",
                data=response
            )
            
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        await logging_service.error(f"Failed to send message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/history")
async def get_session_history(
    session_id: str,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        history = await session_service.get_history(session_id)
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(history)} messages",
            data={"messages": history, "count": len(history)}
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        await logging_service.error(f"Failed to get session history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        deleted = await session_service.delete_session(session_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        await logging_service.info(f"Session deleted: {session_id}")
        
        return APIResponse(
            success=True,
            message=f"Session {session_id} deleted"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to delete session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_sessions(
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        sessions = await session_service.list_sessions()
        
        return APIResponse(
            success=True,
            message=f"Found {len(sessions)} sessions",
            data={"sessions": sessions, "count": len(sessions)}
        )
        
    except Exception as e:
        await logging_service.error(f"Failed to list sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/clear")
async def clear_session_history(
    session_id: str,
    current_user: User = Security(get_current_user, scopes=["viewer"])
):
    try:
        cleared = await session_service.clear_session_history(session_id)
        
        if not cleared:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        return APIResponse(
            success=True,
            message=f"Session {session_id} history cleared"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await logging_service.error(f"Failed to clear session history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
