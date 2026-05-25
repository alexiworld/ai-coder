from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from backend.database import get_connection, init_db
from backend.repository import create_session, get_user_by_session, delete_session, ensure_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()

# For MVP: any username/password combination works
# In production, passwords would be hashed and verified


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


class MeResponse(BaseModel):
    username: str


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    conn = get_connection()
    try:
        username = get_user_by_session(conn, credentials.credentials)
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return username
    finally:
        conn.close()


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    if not request.username or not request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username and password required",
        )

    conn = get_connection()
    try:
        init_db(conn)
        user_id = ensure_user(conn, request.username)
        token = create_session(conn, user_id)
        return LoginResponse(token=token, username=request.username)
    finally:
        conn.close()


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    conn = get_connection()
    try:
        delete_session(conn, credentials.credentials)
        return {"message": "Logged out"}
    finally:
        conn.close()


@router.get("/me", response_model=MeResponse)
def me(username: str = Depends(get_current_user)):
    return MeResponse(username=username)
