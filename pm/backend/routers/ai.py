import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.database import get_connection
from backend.repository import get_board, add_card, move_card, delete_card, edit_card
from backend.services.ai import call_ai, get_client
from backend.routers.auth import get_current_user
from backend.models import (
    AIResponse,
    BoardUpdate,
    ChatRequest,
    ChatResponse,
    BoardOut,
    CardOut,
    ColumnOut,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

# In-memory conversation history per username
conversations: dict[str, list[dict]] = {}

SYSTEM_PROMPT = """You are a Kanban board assistant. You help users manage their project board.

You can read the current board state and make changes by returning structured output.

The board has columns with cards in them. You can:
1. Add new cards to any column
2. Move cards between columns
3. Edit card titles and details
4. Delete cards

The current board state (including column IDs and titles) is included with each user message.
Use the column IDs from the board JSON when specifying targets for add_cards and move_cards.

Return a JSON object with:
- "message": your natural language response to the user
- "board_updates": an object (or null) with any of these fields:
  - "add_cards": list of { "column_id": str, "title": str, "details": str }
  - "move_cards": list of { "card_id": str, "target_column_id": str }
  - "edit_cards": list of { "card_id": str, "title": str | null, "details": str | null }
  - "delete_card_ids": list of card_id strings

Only include board_updates if the user asked for a change. If you're just answering a question, set board_updates to null.
"""


class SimpleTestRequest(BaseModel):
    prompt: str = "What is 2+2?"


class SimpleTestResponse(BaseModel):
    response: str


def _apply_updates(
    conn, username: str, updates: BoardUpdate, board_id: Optional[int] = None
) -> None:
    try:
        for card in updates.add_cards:
            add_card(
                conn, username, card.column_id, card.title, card.details,
                board_id=board_id, commit=False,
            )
        for card in updates.move_cards:
            move_card(
                conn, username, card.card_id, card.target_column_id,
                board_id=board_id, commit=False,
            )
        for card in updates.edit_cards:
            edit_card(
                conn, username, card.card_id,
                title=card.title, details=card.details,
                board_id=board_id, commit=False,
            )
        for card_id in updates.delete_card_ids:
            delete_card(conn, username, card_id, board_id=board_id, commit=False)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


@router.post("/test", response_model=SimpleTestResponse)
def ai_test(
    request: SimpleTestRequest,
    username: str = Depends(get_current_user),
):
    client = get_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env",
        )

    messages = [
        {"role": "system", "content": "You are a helpful assistant. Be concise."},
        {"role": "user", "content": request.prompt},
    ]

    result = call_ai(messages, client=client)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service call failed",
        )

    return SimpleTestResponse(response=result)


def _to_board_out(data: dict) -> BoardOut:
    return BoardOut(
        id=data["id"],
        name=data["name"],
        columns=[ColumnOut(**c) for c in data["columns"]],
        cards={k: CardOut(**v) for k, v in data["cards"].items()},
    )


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    request: ChatRequest,
    username: str = Depends(get_current_user),
):
    client = get_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env",
        )

    conn = get_connection()
    try:
        board_data = get_board(conn, username, request.board_id)

        conv_key = f"{username}:{request.board_id or 'default'}"
        if conv_key not in conversations:
            conversations[conv_key] = []

        conversations[conv_key].append({"role": "user", "content": request.message})

        board_context = json.dumps(board_data, indent=2)
        context_message = {
            "role": "user",
            "content": f"Here is the current board state (in JSON):\n{board_context}\n\nUser message: {request.message}",
        }

        ai_messages = (
            [{"role": "system", "content": SYSTEM_PROMPT}]
            + conversations[conv_key][:-1]
            + [context_message]
        )

        raw = call_ai(
            ai_messages,
            response_format={
                "type": "json_object",
                "schema": AIResponse.model_json_schema(),
            },
            client=client,
        )
        if raw is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service call failed",
            )

        try:
            parsed = AIResponse.model_validate_json(raw)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to parse AI response: {e}",
            )

        if parsed.board_updates:
            _apply_updates(conn, username, parsed.board_updates, board_id=request.board_id)

        conversations[conv_key].append({"role": "assistant", "content": parsed.message})

        if len(conversations[conv_key]) > 20:
            conversations[conv_key] = conversations[conv_key][-20:]

        updated_board = get_board(conn, username, request.board_id)
        return ChatResponse(message=parsed.message, board=_to_board_out(updated_board))
    finally:
        conn.close()
