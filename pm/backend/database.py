import hashlib
import os
import sqlite3
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "kanban.db"

_BASE_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Board',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_id, column_id)
);

CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(column_id, card_id)
);

CREATE TABLE IF NOT EXISTS card_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS card_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#209dd7'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_card_comments_card_id ON card_comments(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id);
"""

_DEFAULT_COLUMNS = [
    ("col-backlog", "Backlog", 0),
    ("col-discovery", "Discovery", 1),
    ("col-progress", "In Progress", 2),
    ("col-review", "Review", 3),
    ("col-done", "Done", 4),
]


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode(), 260000)
    return f"pbkdf2:sha256:{salt}:{dk.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    if password_hash == "placeholder":
        return True
    parts = password_hash.split(":")
    if len(parts) != 4 or parts[0] != "pbkdf2" or parts[1] != "sha256":
        return False
    _, _, salt, stored_dk = parts
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode(), 260000)
    return dk.hex() == stored_dk


def get_connection(db_path: str | None = None) -> sqlite3.Connection:
    actual_path = db_path or str(DB_PATH)
    os.makedirs(os.path.dirname(actual_path), exist_ok=True)
    conn = sqlite3.connect(actual_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _apply_schema_migrations(conn: sqlite3.Connection) -> None:
    """Detect and apply schema changes to existing databases."""
    # Remove UNIQUE(user_id) from boards if it exists (allows multiple boards per user)
    cursor = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='boards'")
    row = cursor.fetchone()
    if row and "UNIQUE" in (row["sql"] or ""):
        conn.executescript("""
            PRAGMA foreign_keys=OFF;
            CREATE TABLE boards_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL DEFAULT 'My Board',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO boards_new SELECT id, user_id, name, created_at, updated_at FROM boards;
            DROP TABLE boards;
            ALTER TABLE boards_new RENAME TO boards;
            PRAGMA foreign_keys=ON;
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id)")
        conn.commit()

    # Add priority and due_date to cards if missing
    cursor = conn.execute("PRAGMA table_info(cards)")
    card_cols = {row["name"] for row in cursor.fetchall()}
    if "priority" not in card_cols:
        conn.execute("ALTER TABLE cards ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'")
    if "due_date" not in card_cols:
        conn.execute("ALTER TABLE cards ADD COLUMN due_date TEXT")

    # Add color to columns if missing
    cursor = conn.execute("PRAGMA table_info(columns)")
    col_cols = {row["name"] for row in cursor.fetchall()}
    if "color" not in col_cols:
        conn.execute("ALTER TABLE columns ADD COLUMN color TEXT")

    conn.commit()


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(_BASE_SCHEMA_SQL)
    _apply_schema_migrations(conn)
    conn.commit()


def ensure_user(conn: sqlite3.Connection, username: str, password: str = "") -> int:
    """Ensure user exists. Returns user_id. Creates board + columns if new.
    For new users, stores a hashed password. For existing placeholder-hashed users,
    updates the hash on first real login."""
    cursor = conn.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    if row:
        user_id = row["id"]
        # Upgrade placeholder hash to real hash if a real password is provided
        if row["password_hash"] == "placeholder" and password:
            new_hash = hash_password(password)
            conn.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (new_hash, user_id),
            )
            conn.commit()
        return user_id

    pw_hash = hash_password(password) if password else "placeholder"
    cursor = conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, pw_hash),
    )
    user_id = cursor.lastrowid

    # Create default board
    cursor = conn.execute(
        "INSERT INTO boards (user_id, name) VALUES (?, ?)", (user_id, "My Board")
    )
    board_id = cursor.lastrowid

    for col_id, title, position in _DEFAULT_COLUMNS:
        conn.execute(
            "INSERT INTO columns (board_id, column_id, title, position) VALUES (?, ?, ?, ?)",
            (board_id, col_id, title, position),
        )

    conn.commit()
    return user_id
