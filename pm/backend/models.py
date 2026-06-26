from pydantic import BaseModel, field_validator
from typing import Optional


class RenameColumnRequest(BaseModel):
    title: str


class AddColumnRequest(BaseModel):
    title: str
    color: Optional[str] = None


class AddCardRequest(BaseModel):
    column_id: str
    title: str
    details: str = ""
    priority: str = "medium"
    due_date: Optional[str] = None


class EditCardRequest(BaseModel):
    title: Optional[str] = None
    details: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


class MoveCardRequest(BaseModel):
    target_column_id: str
    position: Optional[int] = None


class CardOut(BaseModel):
    id: str
    title: str
    details: str
    priority: str = "medium"
    due_date: Optional[str] = None
    labels: list["LabelOut"] = []
    comment_count: int = 0


class ColumnOut(BaseModel):
    id: str
    title: str
    cardIds: list[str]
    color: Optional[str] = None


class BoardOut(BaseModel):
    id: int
    name: str
    columns: list[ColumnOut]
    cards: dict[str, CardOut]


class BoardSummary(BaseModel):
    id: int
    name: str
    created_at: str
    column_count: int
    card_count: int


class CreateBoardRequest(BaseModel):
    name: str


class RenameBoardRequest(BaseModel):
    name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ReorderColumnsRequest(BaseModel):
    column_ids: list[str]


class AddCommentRequest(BaseModel):
    content: str


class CommentOut(BaseModel):
    id: int
    username: str
    content: str
    created_at: str


class AddLabelRequest(BaseModel):
    label: str
    color: str = "#209dd7"


class LabelOut(BaseModel):
    id: int
    label: str
    color: str


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

    @field_validator("add_cards", "move_cards", "edit_cards", "delete_card_ids", mode="before")
    @classmethod
    def _coerce_null_to_list(cls, v):
        return v if v is not None else []


class AIResponse(BaseModel):
    message: str
    board_updates: Optional[BoardUpdate] = None


class ChatRequest(BaseModel):
    message: str
    board_id: Optional[int] = None


class ChatResponse(BaseModel):
    message: str
    board: BoardOut
