"""Authentication Router - OAuth2 and Token management"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm, SecurityScopes
from jose import JWTError, jwt
from pydantic import BaseModel

from ..core.security import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    get_current_user,
    Token,
    User,
    get_password_hash,
    USERS_DB,
    get_user
)
from ..core.config import settings
from ..models.requests import UserCreateRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "scopes": user.scopes},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        data={"sub": user.username, "scopes": user.scopes}
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/refresh", response_model=Token)
async def refresh_access_token(request: RefreshTokenRequest):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            request.refresh_token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        token_type = payload.get("type")
        if token_type != "refresh":
            raise credentials_exception
        
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        
        scopes = payload.get("scopes", [])
        
    except JWTError:
        raise credentials_exception
    
    user = get_user(username)
    if user is None:
        raise credentials_exception
    
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user.username, "scopes": user.scopes},
        expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(
        data={"sub": user.username, "scopes": user.scopes}
    )
    
    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )


@router.get("/me", response_model=User)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    return current_user


@router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreateRequest,
    current_user: User = Depends(get_current_active_user)
):
    if "admin" not in current_user.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users"
        )
    
    if user_data.username in USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    valid_scopes = ["admin", "model-manager", "viewer"]
    for scope in user_data.scopes:
        if scope not in valid_scopes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid scope: {scope}"
            )
    
    USERS_DB[user_data.username] = {
        "username": user_data.username,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "disabled": False,
        "hashed_password": get_password_hash(user_data.password),
        "scopes": user_data.scopes
    }
    
    return User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        disabled=False,
        scopes=user_data.scopes
    )


@router.get("/users", response_model=list[User])
async def list_users(
    current_user: User = Depends(get_current_active_user)
):
    if "admin" not in current_user.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list users"
        )
    
    return [
        User(
            username=user["username"],
            email=user.get("email"),
            full_name=user.get("full_name"),
            disabled=user.get("disabled", False),
            scopes=user.get("scopes", [])
        )
        for user in USERS_DB.values()
    ]


@router.delete("/users/{username}")
async def delete_user(
    username: str,
    current_user: User = Depends(get_current_active_user)
):
    if "admin" not in current_user.scopes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete users"
        )
    
    if username not in USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if username == current_user.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    del USERS_DB[username]
    
    return {"message": f"User {username} deleted successfully"}
