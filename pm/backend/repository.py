import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
import sqlite3

from backend.database import get_connection, init_db, ensure_user, verify_password, hash_password

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


def authenticate_user(conn: sqlite3.Connection, username: str, password: str) -> Optional[int]:
    """Authenticate and return user_id, or None on failure."""
    cursor = conn.execute(
        "SELECT id, password_hash FROM users WHERE username = ?", (username,)
    )
    row = cursor.fetchone()
    if not row:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return row["id"]


def change_password(conn: sqlite3.Connection, username: str, new_password: str) -> None:
    new_hash = hash_password(new_password)
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE username = ?",
        (new_hash, username),
    )
    conn.commit()


# --- Internal helpers ---


def get_user_id(conn: sqlite3.Connection, username: str) -> int:
    cursor = conn.execute("SELECT id FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    if not row:
        raise ValueError(f"User {username!r} not found")
    return row["id"]


def _get_default_board_id(conn: sqlite3.Connection, user_id: int) -> Optional[int]:
    cursor = conn.execute(
        "SELECT id FROM boards WHERE user_id = ? ORDER BY id LIMIT 1", (user_id,)
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def _assert_board_owner(conn: sqlite3.Connection, user_id: int, board_id: int) -> None:
    cursor = conn.execute(
        "SELECT id FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)
    )
    if not cursor.fetchone():
        raise ValueError(f"Board {board_id} not found or not owned by user")


# --- Board Management ---


def list_boards(conn: sqlite3.Connection, username: str) -> list[dict]:
    user_id = get_user_id(conn, username)
    cursor = conn.execute(
        """SELECT b.id, b.name, b.created_at,
                  COUNT(DISTINCT col.id) AS column_count,
                  COUNT(DISTINCT c.id) AS card_count
           FROM boards b
           LEFT JOIN columns col ON col.board_id = b.id
           LEFT JOIN cards c ON c.column_id = col.id
           WHERE b.user_id = ?
           GROUP BY b.id
           ORDER BY b.id""",
        (user_id,),
    )
    return [dict(row) for row in cursor.fetchall()]


def create_board(conn: sqlite3.Connection, username: str, name: str) -> int:
    user_id = get_user_id(conn, username)
    cursor = conn.execute(
        "INSERT INTO boards (user_id, name) VALUES (?, ?)", (user_id, name)
    )
    board_id = cursor.lastrowid
    from backend.database import _DEFAULT_COLUMNS
    for col_id, title, position in _DEFAULT_COLUMNS:
        conn.execute(
            "INSERT INTO columns (board_id, column_id, title, position) VALUES (?, ?, ?, ?)",
            (board_id, col_id, title, position),
        )
    conn.commit()
    return board_id


def rename_board(conn: sqlite3.Connection, username: str, board_id: int, name: str) -> bool:
    user_id = get_user_id(conn, username)
    cursor = conn.execute(
        "UPDATE boards SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        (name, board_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def delete_board(conn: sqlite3.Connection, username: str, board_id: int) -> bool:
    user_id = get_user_id(conn, username)
    # Prevent deleting the last board
    cursor = conn.execute("SELECT COUNT(*) AS cnt FROM boards WHERE user_id = ?", (user_id,))
    if cursor.fetchone()["cnt"] <= 1:
        raise ValueError("Cannot delete the only board")
    cursor = conn.execute(
        "DELETE FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)
    )
    conn.commit()
    return cursor.rowcount > 0


# --- Board CRUD (columns and cards) ---


def get_board(conn: sqlite3.Connection, username: str, board_id: Optional[int] = None) -> dict:
    user_id = get_user_id(conn, username)

    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)
        if board_id is None:
            return {"id": 0, "name": "My Board", "columns": [], "cards": {}}
    else:
        _assert_board_owner(conn, user_id, board_id)

    board_row = conn.execute("SELECT id, name FROM boards WHERE id = ?", (board_id,)).fetchone()

    cursor = conn.execute(
        """SELECT c.column_id, c.title AS column_title, c.position AS col_position, c.color,
                  cd.id AS card_int_id, cd.card_id, cd.title, cd.details, cd.priority, cd.due_date, cd.position AS card_position
           FROM columns c
           LEFT JOIN cards cd ON cd.column_id = c.id
           WHERE c.board_id = ?
           ORDER BY c.position, cd.position""",
        (board_id,),
    )
    rows = cursor.fetchall()

    columns_map: dict[str, dict] = {}
    cards_map: dict[str, dict] = {}
    card_int_ids: dict[str, int] = {}  # card_id -> internal id

    for row in rows:
        col_id = row["column_id"]
        if col_id not in columns_map:
            columns_map[col_id] = {
                "id": col_id,
                "title": row["column_title"],
                "cardIds": [],
                "color": row["color"],
            }

        card_id = row["card_id"]
        if card_id:
            columns_map[col_id]["cardIds"].append(card_id)
            cards_map[card_id] = {
                "id": card_id,
                "title": row["title"],
                "details": row["details"],
                "priority": row["priority"] or "medium",
                "due_date": row["due_date"],
                "labels": [],
                "comment_count": 0,
            }
            card_int_ids[card_id] = row["card_int_id"]

    # Fetch labels for all cards
    if card_int_ids:
        placeholders = ",".join("?" * len(card_int_ids))
        label_rows = conn.execute(
            f"SELECT card_id, id, label, color FROM card_labels WHERE card_id IN ({placeholders}) ORDER BY id",
            list(card_int_ids.values()),
        ).fetchall()
        int_id_to_card: dict[int, str] = {v: k for k, v in card_int_ids.items()}
        for lr in label_rows:
            cid = int_id_to_card.get(lr["card_id"])
            if cid and cid in cards_map:
                cards_map[cid]["labels"].append({"id": lr["id"], "label": lr["label"], "color": lr["color"]})

        # Fetch comment counts
        comment_rows = conn.execute(
            f"SELECT card_id, COUNT(*) AS cnt FROM card_comments WHERE card_id IN ({placeholders}) GROUP BY card_id",
            list(card_int_ids.values()),
        ).fetchall()
        for cr in comment_rows:
            cid = int_id_to_card.get(cr["card_id"])
            if cid and cid in cards_map:
                cards_map[cid]["comment_count"] = cr["cnt"]

    return {
        "id": board_row["id"],
        "name": board_row["name"],
        "columns": list(columns_map.values()),
        "cards": cards_map,
    }


def rename_column(
    conn: sqlite3.Connection,
    username: str,
    column_id: str,
    title: str,
    board_id: Optional[int] = None,
) -> bool:
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)
    cursor = conn.execute(
        """UPDATE columns SET title = ?
           WHERE column_id = ? AND board_id = (SELECT id FROM boards WHERE id = ? AND user_id = ?)""",
        (title, column_id, board_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def add_column(
    conn: sqlite3.Connection,
    username: str,
    title: str,
    board_id: Optional[int] = None,
    color: Optional[str] = None,
) -> Optional[str]:
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)
    if board_id is None:
        return None
    _assert_board_owner(conn, user_id, board_id)

    cursor = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM columns WHERE board_id = ?",
        (board_id,),
    )
    next_pos = cursor.fetchone()["next_pos"]
    col_id = f"col-{secrets.token_hex(4)}"

    conn.execute(
        "INSERT INTO columns (board_id, column_id, title, position, color) VALUES (?, ?, ?, ?, ?)",
        (board_id, col_id, title, next_pos, color),
    )
    conn.commit()
    return col_id


def delete_column(
    conn: sqlite3.Connection,
    username: str,
    column_id: str,
    board_id: Optional[int] = None,
) -> bool:
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)
    cursor = conn.execute(
        """DELETE FROM columns
           WHERE column_id = ? AND board_id = (SELECT id FROM boards WHERE id = ? AND user_id = ?)""",
        (column_id, board_id, user_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def add_card(
    conn: sqlite3.Connection,
    username: str,
    column_id: str,
    title: str,
    details: str,
    priority: str = "medium",
    due_date: Optional[str] = None,
    board_id: Optional[int] = None,
    *,
    commit: bool = True,
) -> Optional[str]:
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)

    card_id = f"card-{secrets.token_hex(4)}"
    cursor = conn.execute(
        """SELECT col.id FROM columns col
           JOIN boards b ON b.id = col.board_id
           WHERE col.column_id = ? AND b.user_id = ? AND b.id = ?""",
        (column_id, user_id, board_id),
    )
    col_row = cursor.fetchone()
    if not col_row:
        return None

    cursor = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM cards WHERE column_id = ?",
        (col_row["id"],),
    )
    next_pos = cursor.fetchone()["next_pos"]

    conn.execute(
        "INSERT INTO cards (column_id, card_id, title, details, priority, due_date, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (col_row["id"], card_id, title, details, priority, due_date, next_pos),
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
    board_id: Optional[int] = None,
    *,
    commit: bool = True,
) -> bool:
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)

    cursor = conn.execute(
        """SELECT col.id FROM columns col
           JOIN boards b ON b.id = col.board_id
           WHERE col.column_id = ? AND b.user_id = ? AND b.id = ?""",
        (target_column_id, user_id, board_id),
    )
    col_row = cursor.fetchone()
    if not col_row:
        return False

    if position is None:
        cursor = conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM cards WHERE column_id = ?",
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
    board_id: Optional[int] = None,
    *,
    commit: bool = True,
) -> bool:
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)

    cursor = conn.execute(
        """DELETE FROM cards WHERE card_id = ? AND column_id IN (
               SELECT col.id FROM columns col
               JOIN boards b ON b.id = col.board_id
               WHERE b.user_id = ? AND b.id = ?
           )""",
        (card_id, user_id, board_id),
    )
    if commit:
        conn.commit()
    return cursor.rowcount > 0


def _get_card_internal_id(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    board_id: Optional[int],
) -> Optional[int]:
    """Return the internal integer id of a card verifying ownership."""
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)
    cursor = conn.execute(
        """SELECT c.id FROM cards c
           JOIN columns col ON col.id = c.column_id
           JOIN boards b ON b.id = col.board_id
           WHERE c.card_id = ? AND b.user_id = ? AND b.id = ?""",
        (card_id, user_id, board_id),
    )
    row = cursor.fetchone()
    return row["id"] if row else None


# --- Comments ---


def list_comments(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    board_id: Optional[int] = None,
) -> list[dict]:
    internal_id = _get_card_internal_id(conn, username, card_id, board_id)
    if internal_id is None:
        return []
    cursor = conn.execute(
        "SELECT id, username, content, created_at FROM card_comments WHERE card_id = ? ORDER BY created_at",
        (internal_id,),
    )
    return [dict(row) for row in cursor.fetchall()]


def add_comment(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    content: str,
    board_id: Optional[int] = None,
) -> Optional[dict]:
    internal_id = _get_card_internal_id(conn, username, card_id, board_id)
    if internal_id is None:
        return None
    cursor = conn.execute(
        "INSERT INTO card_comments (card_id, username, content) VALUES (?, ?, ?)",
        (internal_id, username, content),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id, username, content, created_at FROM card_comments WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    return dict(row)


def delete_comment(
    conn: sqlite3.Connection,
    username: str,
    comment_id: int,
) -> bool:
    cursor = conn.execute(
        "DELETE FROM card_comments WHERE id = ? AND username = ?",
        (comment_id, username),
    )
    conn.commit()
    return cursor.rowcount > 0


# --- Labels ---


def list_labels(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    board_id: Optional[int] = None,
) -> list[dict]:
    internal_id = _get_card_internal_id(conn, username, card_id, board_id)
    if internal_id is None:
        return []
    cursor = conn.execute(
        "SELECT id, label, color FROM card_labels WHERE card_id = ? ORDER BY id",
        (internal_id,),
    )
    return [dict(row) for row in cursor.fetchall()]


def add_label(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    label: str,
    color: str = "#209dd7",
    board_id: Optional[int] = None,
) -> Optional[dict]:
    internal_id = _get_card_internal_id(conn, username, card_id, board_id)
    if internal_id is None:
        return None
    cursor = conn.execute(
        "INSERT INTO card_labels (card_id, label, color) VALUES (?, ?, ?)",
        (internal_id, label, color),
    )
    conn.commit()
    return {"id": cursor.lastrowid, "label": label, "color": color}


def delete_label(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    label_id: int,
    board_id: Optional[int] = None,
) -> bool:
    internal_id = _get_card_internal_id(conn, username, card_id, board_id)
    if internal_id is None:
        return False
    cursor = conn.execute(
        "DELETE FROM card_labels WHERE id = ? AND card_id = ?",
        (label_id, internal_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def reorder_columns(
    conn: sqlite3.Connection,
    username: str,
    board_id: int,
    column_ids: list[str],
    *,
    commit: bool = True,
) -> None:
    user_id = get_user_id(conn, username)
    _assert_board_owner(conn, user_id, board_id)
    for position, col_id in enumerate(column_ids):
        conn.execute(
            "UPDATE columns SET position = ? WHERE column_id = ? AND board_id = ?",
            (position, col_id, board_id),
        )
    if commit:
        conn.commit()


def edit_card(
    conn: sqlite3.Connection,
    username: str,
    card_id: str,
    title: Optional[str] = None,
    details: Optional[str] = None,
    priority: Optional[str] = None,
    due_date: Optional[str] = None,
    board_id: Optional[int] = None,
    *,
    commit: bool = True,
) -> bool:
    user_id = get_user_id(conn, username)
    if board_id is None:
        board_id = _get_default_board_id(conn, user_id)

    updates = []
    params: list = []
    if title is not None:
        updates.append("title = ?")
        params.append(title)
    if details is not None:
        updates.append("details = ?")
        params.append(details)
    if priority is not None:
        updates.append("priority = ?")
        params.append(priority)
    if due_date is not None:
        if due_date == "":
            updates.append("due_date = NULL")
        else:
            updates.append("due_date = ?")
            params.append(due_date)

    if not updates:
        return False

    params.extend([card_id, user_id, board_id])

    cursor = conn.execute(
        f"""UPDATE cards SET {', '.join(updates)}
           WHERE card_id = ? AND column_id IN (
               SELECT col.id FROM columns col
               JOIN boards b ON b.id = col.board_id
               WHERE b.user_id = ? AND b.id = ?
           )""",
        params,
    )
    if commit:
        conn.commit()
    return cursor.rowcount > 0
