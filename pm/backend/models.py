from pydantic import BaseModel
from typing import Optional


class RenameColumnRequest(BaseModel):
    title: str


class AddCardRequest(BaseModel):
    column_id: str
    title: str
    details: str = ""


class EditCardRequest(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None


class MoveCardRequest(BaseModel):
    target_column_id: str
    position: Optional[int] = None


class CardOut(BaseModel):
    id: str
    title: str
    details: str


class ColumnOut(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class BoardOut(BaseModel):
    columns: list[ColumnOut]
    cards: dict[str, CardOut]


# --- AI structured output models ---

class NewCard(BaseModel):
    column_id: str
    title: str
    details: str = ""


class MovedCard(BaseModel):
    card_id: str
    target_column_id: str


class EditedCard(BaseModel):
    card_id: str
    title: Optional[str] = None
    details: Optional[str] = None


class BoardUpdate(BaseModel):
    add_cards: list[NewCard] = []
    move_cards: list[MovedCard] = []
    edit_cards: list[EditedCard] = []
    delete_card_ids: list[str] = []


class AIResponse(BaseModel):
    message: str
    board_updates: Optional[BoardUpdate] = None


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message: str
    board: BoardOut