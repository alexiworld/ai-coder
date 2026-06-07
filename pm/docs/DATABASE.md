# Kanban Studio - Database Design

## Overview

SQLite database stored at `data/kanban.db`. Auto-created on first startup if the file doesn't exist. All migrations run on application startup.

## Schema

```sql
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
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(board_id, column_id)
);

CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(column_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);
```

## Rationale: Normalized Tables vs JSON

Normalized relational tables were chosen over storing the board as a JSON blob for three reasons:

1. **Atomic updates** - Moving a single card or renaming a column can be done with a precise SQL UPDATE instead of reading, modifying, and rewriting the entire JSON blob. This avoids race conditions when multiple requests arrive.

2. **Referential integrity** - Foreign key constraints (with CASCADE deletes) ensure that deleting a user cleans up their board, deleting a column removes its cards, etc. JSON gives no such guarantees.

3. **Query flexibility** - Future features like searching cards across users, sorting by created_at, or aggregating card counts per column are trivial SQL queries. With JSON you'd need application-level parsing.

The tradeoff is more tables and slightly more complex queries to reconstruct the board, but the app-level assembly logic is straightforward (join columns -> join cards, group into the frontend's expected format).

## Default Seed Data

When a new user is created, a board is automatically created with five default columns:

| Position | column_id      | Title         |
|----------|----------------|---------------|
| 0        | col-backlog    | Backlog       |
| 1        | col-discovery  | Discovery     |
| 2        | col-progress   | In Progress   |
| 3        | col-review     | Review        |
| 4        | col-done       | Done          |

No default cards are created. The board starts empty.

## Migration Strategy

Since this is an MVP with a single developer, migrations are handled by running `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` on every startup. Schema changes in future versions will use sequential DDL statements wrapped in existence checks.

If a table needs to be altered, the pattern will be:
```python
import sqlite3

conn = sqlite3.connect("data/kanban.db")
# Add column if not present (SQLite doesn't support IF NOT EXISTS for columns)
try:
    conn.execute("ALTER TABLE boards ADD COLUMN description TEXT DEFAULT ''")
except sqlite3.OperationalError:
    pass  # Column already exists
```

## Core Queries

### Get full board for a user
```sql
SELECT c.column_id, c.title AS column_title, c.position AS col_position,
       cd.card_id, cd.title, cd.details, cd.position AS card_position
FROM columns c
LEFT JOIN cards cd ON cd.column_id = c.id
WHERE c.board_id = (SELECT id FROM boards WHERE user_id = ?)
ORDER BY c.position, cd.position;
```

This returns rows that the application groups into the frontend's BoardData shape.

### Add a card to a column
```sql
INSERT INTO cards (column_id, card_id, title, details, position)
VALUES (
    (SELECT id FROM columns WHERE board_id = (SELECT id FROM boards WHERE user_id = ?) AND column_id = ?),
    ?, ?, ?,
    (SELECT COALESCE(MAX(position), -1) + 1 FROM cards cd
     JOIN columns col ON col.id = cd.column_id
     WHERE col.board_id = (SELECT id FROM boards WHERE user_id = ?) AND col.column_id = ?)
);
```

### Move a card
```sql
-- Step 1: Remove from old position (gap will be filled by position order)
-- Step 2: Insert at new column/position
UPDATE cards
SET column_id = (SELECT id FROM columns WHERE board_id = (SELECT id FROM boards WHERE user_id = ?) AND column_id = ?),
    position = ?
WHERE card_id = ?;
```

### Delete a card
```sql
DELETE FROM cards WHERE card_id = ?;
```

### Rename a column
```sql
UPDATE columns SET title = ? WHERE column_id = ? AND board_id = (SELECT id FROM boards WHERE user_id = ?);
```

## Usage Notes

- All `card_id` and `column_id` values are text-based identifiers used by the frontend (e.g. "card-1", "col-backlog"). The integer `id` columns are internal foreign keys.
- The `sessions` table stores tokens with expiration; expired sessions should be cleaned up on startup.
- The `users` table will store hashed passwords (using passlib or bcrypt in production), but for MVP the hardcoded check is sufficient.