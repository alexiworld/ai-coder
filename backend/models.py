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