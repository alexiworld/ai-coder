from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_connection
from backend.repository import (
    list_boards,
    create_board,
    get_board,
    rename_board,
    delete_board,
    rename_column,
    add_column,
    delete_column,
    add_card,
    move_card,
    delete_card,
    edit_card,
)
from backend.models import (
    BoardSummary,
    BoardOut,
    ColumnOut,
    CardOut,
    CreateBoardRequest,
    RenameBoardRequest,
    RenameColumnRequest,
    AddColumnRequest,
    AddCardRequest,
    EditCardRequest,
    MoveCardRequest,
)
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/api/boards", tags=["boards"])


def _to_board_out(data: dict) -> BoardOut:
    return BoardOut(
        id=data["id"],
        name=data["name"],
        columns=[ColumnOut(**c) for c in data["columns"]],
        cards={k: CardOut(**v) for k, v in data["cards"].items()},
    )


@router.get("", response_model=list[BoardSummary])
def list_boards_endpoint(username: str = Depends(get_current_user)):
    conn = get_connection()
    try:
        return list_boards(conn, username)
    finally:
        conn.close()


@router.post("", response_model=BoardOut)
def create_board_endpoint(
    request: CreateBoardRequest,
    username: str = Depends(get_current_user),
):
    if not request.name.strip():
        raise HTTPException(status_code=422, detail="Board name cannot be empty")
    conn = get_connection()
    try:
        board_id = create_board(conn, username, request.name.strip())
        return _to_board_out(get_board(conn, username, board_id))
    finally:
        conn.close()


@router.get("/{board_id}", response_model=BoardOut)
def get_board_endpoint(
    board_id: int,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        try:
            return _to_board_out(get_board(conn, username, board_id))
        except ValueError:
            raise HTTPException(status_code=404, detail="Board not found")
    finally:
        conn.close()


@router.put("/{board_id}/name")
def rename_board_endpoint(
    board_id: int,
    request: RenameBoardRequest,
    username: str = Depends(get_current_user),
):
    if not request.name.strip():
        raise HTTPException(status_code=422, detail="Board name cannot be empty")
    conn = get_connection()
    try:
        ok = rename_board(conn, username, board_id, request.name.strip())
        if not ok:
            raise HTTPException(status_code=404, detail="Board not found")
        return {"status": "ok"}
    finally:
        conn.close()


@router.delete("/{board_id}")
def delete_board_endpoint(
    board_id: int,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        try:
            ok = delete_board(conn, username, board_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if not ok:
            raise HTTPException(status_code=404, detail="Board not found")
        return {"status": "ok"}
    finally:
        conn.close()


# --- Column management per board ---

@router.post("/{board_id}/columns")
def add_column_endpoint(
    board_id: int,
    request: AddColumnRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        col_id = add_column(conn, username, request.title, board_id=board_id, color=request.color)
        if col_id is None:
            raise HTTPException(status_code=404, detail="Board not found")
        return {"column_id": col_id}
    except ValueError:
        raise HTTPException(status_code=404, detail="Board not found")
    finally:
        conn.close()


@router.put("/{board_id}/columns/{column_id}/rename")
def rename_column_endpoint(
    board_id: int,
    column_id: str,
    request: RenameColumnRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = rename_column(conn, username, column_id, request.title, board_id=board_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Column not found")
        return {"status": "ok"}
    finally:
        conn.close()


@router.delete("/{board_id}/columns/{column_id}")
def delete_column_endpoint(
    board_id: int,
    column_id: str,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = delete_column(conn, username, column_id, board_id=board_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Column not found")
        return {"status": "ok"}
    finally:
        conn.close()


# --- Card management per board ---

@router.post("/{board_id}/cards")
def add_card_endpoint(
    board_id: int,
    request: AddCardRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        card_id = add_card(
            conn, username, request.column_id, request.title, request.details,
            request.priority, request.due_date, board_id=board_id,
        )
        if card_id is None:
            raise HTTPException(status_code=404, detail="Column not found")
        return {"card_id": card_id}
    finally:
        conn.close()


@router.put("/{board_id}/cards/{card_id}/move")
def move_card_endpoint(
    board_id: int,
    card_id: str,
    request: MoveCardRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = move_card(
            conn, username, card_id, request.target_column_id,
            request.position, board_id=board_id,
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Card or column not found")
        return {"status": "ok"}
    finally:
        conn.close()


@router.delete("/{board_id}/cards/{card_id}")
def delete_card_endpoint(
    board_id: int,
    card_id: str,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = delete_card(conn, username, card_id, board_id=board_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Card not found")
        return {"status": "ok"}
    finally:
        conn.close()


@router.put("/{board_id}/cards/{card_id}")
def edit_card_endpoint(
    board_id: int,
    card_id: str,
    request: EditCardRequest,
    username: str = Depends(get_current_user),
):
    conn = get_connection()
    try:
        ok = edit_card(
            conn, username, card_id, request.title, request.details,
            request.priority, request.due_date, board_id=board_id,
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Card not found")
        return {"status": "ok"}
    finally:
        conn.close()
