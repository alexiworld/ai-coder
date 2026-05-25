import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()

# Simple in-memory token store: token -> username
tokens: dict[str, dict] = {}

TOKEN_EXPIRE_HOURS = 24

VALID_USER = "user"
VALID_PASSWORD = "password"


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


class MeResponse(BaseModel):
    username: str


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    session = tokens.get(token)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    expires = session.get("expires")
    if expires and datetime.now(timezone.utc) > expires:
        del tokens[token]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    return session["username"]


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    if request.username != VALID_USER or request.password != VALID_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = secrets.token_urlsafe(32)
    tokens[token] = {
        "username": request.username,
        "expires": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return LoginResponse(token=token, username=request.username)


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    tokens.pop(credentials.credentials, None)
    return {"message": "Logged out"}


@router.get("/me", response_model=MeResponse)
def me(username: str = Depends(get_current_user)):
    return MeResponse(username=username)