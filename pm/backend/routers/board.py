from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_connection
from backend.repository import (
    get_board,
    rename_column,
    add_card,
    move_card,
    delete_card,
    edit_card,
)
from backend.models import (
    RenameColumnRequest,
    AddCardRequest,
    EditCardRequest,
    MoveCardRequest,
    BoardOut,
)
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/api/board", tags=["board"])


@router.get("", response_model=BoardOut)
def read_board(username: str = Depends(get_current_user)):
    conn = get_connection()
    try:
        return get_board(conn, username)
    finally:
        conn.close()


@router.put("/columns/{column_id}/rename")
def rename_column_endpoint(
    column_id: str,
    request: RenameColumnRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = rename_column(conn, username, column_id, request.title)
        if not ok:
            raise HTTPException(status_code=404, detail="Column not found")
        return {"status": "ok"}
    finally:
        conn.close()


@router.post("/cards")
def add_card_endpoint(
    request: AddCardRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        card_id = add_card(conn, username, request.column_id, request.title, request.details)
        if card_id is None:
            raise HTTPException(status_code=404, detail="Column not found")
        return {"card_id": card_id}
    finally:
        conn.close()


@router.put("/cards/{card_id}/move")
def move_card_endpoint(
    card_id: str,
    request: MoveCardRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = move_card(conn, username, card_id, request.target_column_id, request.position)
        if not ok:
            raise HTTPException(status_code=404, detail="Card or column not found")
        return {"status": "ok"}
    finally:
        conn.close()


@router.delete("/cards/{card_id}")
def delete_card_endpoint(
    card_id: str,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = delete_card(conn, username, card_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Card not found")
        return {"status": "ok"}
    finally:
        conn.close()


@router.put("/cards/{card_id}")
def edit_card_endpoint(
    card_id: str,
    request: EditCardRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = edit_card(conn, username, card_id, request.title, request.details)
        if not ok:
            raise HTTPException(status_code=404, detail="Card not found")
        return {"status": "ok"}
    finally:
        conn.close()
