import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
import sqlite3

from backend.database import get_connection, init_db, ensure_user

TOKEN_EXPIRE_HOURS = 24


# --- Session Management ---


def create_session(conn: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    conn.execute(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires.isoformat()),
    )
    conn.commit()
    return token


def get_user_by_session(conn: sqlite3.Connection, token: str) -> Optional[str]:
    cursor = conn.execute(
        "SELECT user_id, expires_at FROM sessions WHERE id = ?", (token,)
    )
    row = cursor.fetchone()
    if not row:
        return None

    expires = datetime.fromisoformat(row["expires_at"])
    if expires < datetime.now(timezone.utc):
        conn.execute("DELETE FROM sessions WHERE id = ?", (token,))
        conn.commit()
        return None

    cursor = conn.execute("SELECT username FROM users WHERE id = ?", (row["user_id"],))
    user = cursor.fetchone()
    return user["username"] if user else None


def delete_session(conn: sqlite3.Connection, token: str) -> None:
    conn.execute("DELETE FROM sessions WHERE id = ?", (token,))
    conn.commit()


# --- Internal helpers ---


def get_user_id(conn: sqlite3.Connection, username: str) -> int:
    """Fetch the user_id for an authenticated user. Raises if not found."""
    cursor = conn.execute("SELECT id FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    if not row:
        raise ValueError(f"User {username!r} not found")
    return row["id"]


# --- Board CRUD ---


def get_board(conn: sqlite3.Connection, username: str) -> dict:
    user_id = get_user_id(conn, username)

    cursor = conn.execute(
        """SELECT c.column_id, c.title AS column_title, c.position AS col_position,
                  cd.card_id, cd.title, cd.details, cd.position AS card_position
           FROM columns c
           LEFT JOIN cards cd ON cd.column_id = c.id
           WHERE c.board_id = (SELECT id FROM boards WHERE user_id = ?)
           ORDER BY c.position, cd.position""",
        (user_id,),
    )
    rows = cursor.fetchall()

    columns_map: dict[str, dict] = {}
    cards_map: dict[str, dict] = {}

    for row in rows:
        col_id = row["column_id"]
        if col_id not in columns_map:
            columns_map[col_id] = {
                "id": col_id,
                "title": row["column_title"],
                "cardIds": [],
            }

        card_id = row["card_id"]
        if card_id:
            columns_map[col_id]["cardIds"].append(card_id)
            cards_map[card_id] = {
                "id": card_id,
                "title": row["title"],
                "details": row["details"],
            }

    return {
        "columns": list(columns_map.values()),
        "cards": cards_map,
    }


def rename_column(conn: sqlite3.Connection, username: str, column_id: str, title: str) -> bool:
    user_id = get_user_id(conn, username)
    cursor = conn.execute(
        """UPDATE columns SET title = ?
           WHERE column_id = ? AND board_id = (SELECT id FROM boards WHERE user_id = ?)""",
        (title, column_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def add_card(
    conn: sqlite3.Connection,
    username: str,
    column_id: str,
    title: str,
    details: str,
    *,
    commit: bool = True,
) -> Optional[str]:
    user_id = get_user_id(conn, username)
    card_id = f"card-{secrets.token_hex(4)}"

    cursor = conn.execute(
        """SELECT col.id FROM columns col
           JOIN boards b ON b.id = col.board_id
           WHERE col.column_id = ? AND b.user_id = ?""",
        (column_id, user_id),
    )
    col_row = cursor.fetchone()
    if not col_row:
        return None

    cursor = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM cards WHERE column_id = ?",
        (col_row["id"],),
    )
    next_pos = cursor.fetchone()["next_pos"]

    conn.execute(
        "INSERT INTO cards (column_id, card_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
        (col_row["id"], card_id, title, details, next_pos),
    )
    if commit:
        conn.commit()
    return card_id


def move_card(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    target_column_id: str,
    position: Optional[int] = None,
    *,
    commit: bool = True,
) -> bool:
    user_id = get_user_id(conn, username)

    cursor = conn.execute(
        """SELECT col.id FROM columns col
           JOIN boards b ON b.id = col.board_id
           WHERE col.column_id = ? AND b.user_id = ?""",
        (target_column_id, user_id),
    )
    col_row = cursor.fetchone()
    if not col_row:
        return False

    if position is None:
        cursor = conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM cards WHERE column_id = ?",
            (col_row["id"],),
        )
        position = cursor.fetchone()["next_pos"]

    conn.execute(
        "UPDATE cards SET column_id = ?, position = ? WHERE card_id = ?",
        (col_row["id"], position, card_id),
    )
    if commit:
        conn.commit()
    return True


def delete_card(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    *,
    commit: bool = True,
) -> bool:
    user_id = get_user_id(conn, username)

    cursor = conn.execute(
        """DELETE FROM cards WHERE card_id = ? AND column_id IN (
               SELECT col.id FROM columns col
               JOIN boards b ON b.id = col.board_id
               WHERE b.user_id = ?
           )""",
        (card_id, user_id),
    )
    if commit:
        conn.commit()
    return cursor.rowcount > 0


def edit_card(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    title: Optional[str] = None,
    details: Optional[str] = None,
    *,
    commit: bool = True,
) -> bool:
    user_id = get_user_id(conn, username)

    updates = []
    params = []
    if title is not None:
        updates.append("title = ?")
        params.append(title)
    if details is not None:
        updates.append("details = ?")
        params.append(details)

    if not updates:
        return False

    params.append(card_id)
    params.append(user_id)

    cursor = conn.execute(
        f"""UPDATE cards SET {', '.join(updates)}
           WHERE card_id = ? AND column_id IN (
               SELECT col.id FROM columns col
               JOIN boards b ON b.id = col.board_id
               WHERE b.user_id = ?
           )""",
        params,
    )
    if commit:
        conn.commit()
    return cursor.rowcount > 0
