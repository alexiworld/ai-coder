from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from backend.database import get_connection, init_db
from backend.repository import (
    create_session,
    get_user_by_session,
    delete_session,
    ensure_user,
    authenticate_user,
    change_password,
    get_user_id,
    register_user,
)
from backend.models import ChangePasswordRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()


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

        # Try to authenticate existing user first
        user_id = authenticate_user(conn, request.username, request.password)
        if user_id is None:
            # Check if user exists at all (new user creation flow)
            try:
                existing_id = get_user_id(conn, request.username)
                # User exists but password didn't match
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid password",
                )
            except ValueError:
                # User doesn't exist — create new account
                user_id = ensure_user(conn, request.username, request.password)

        token = create_session(conn, user_id)
        return LoginResponse(token=token, username=request.username)
    finally:
        conn.close()


@router.post("/register", response_model=LoginResponse, status_code=201)
def register(request: LoginRequest):
    if not request.username or not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password required",
        )
    if len(request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters",
        )
    conn = get_connection()
    try:
        init_db(conn)
        try:
            user_id = register_user(conn, request.username, request.password)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            )
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


@router.put("/me/password")
def update_password(
    request: ChangePasswordRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        user_id = authenticate_user(conn, username, request.current_password)
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect",
            )
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="New password must be at least 6 characters",
            )
        change_password(conn, username, request.new_password)
        return {"status": "ok"}
    finally:
        conn.close()
