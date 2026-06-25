# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kanban Studio** — a full-stack Kanban board app with AI chat. NextJS static frontend served by a FastAPI backend, packaged in a single Docker container. The AI sidebar can create, move, edit, and delete cards via structured OpenRouter responses.

## Running the App

```bash
# Start (from project root — builds and starts Docker container on port 8000)
scripts/start.ps1        # Windows PowerShell
scripts/start.sh         # Mac/Linux

# Stop
scripts/stop.ps1         # Windows PowerShell
scripts/stop.sh          # Mac/Linux
```

The app runs at `http://localhost:8000`. Credentials: any username/password (MVP — `ensure_user()` creates the user on first login).

Requires a `.env` file in the project root with `OPENROUTER_API_KEY`.

## Backend Commands

```bash
cd backend

# Run tests
uv run pytest

# Run a single test file
uv run pytest tests/test_board.py

# Run the dev server locally (outside Docker)
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend Commands

```bash
cd frontend

# Dev server (talks to backend at localhost:8000 for API calls)
npm run dev

# Unit/component tests (Vitest)
npm run test

# Watch mode
npm run test:unit:watch

# E2E tests (Playwright, requires running app)
npm run test:e2e

# All tests
npm run test:all

# Build static output (required before Docker build)
npm run build
```

## Architecture

### Request Flow

Browser → FastAPI (port 8000) → static NextJS files at `/` (served from `frontend/out/`) and API routes at `/api/*`

The frontend is built with `next build` (static export to `frontend/out/`) and served by FastAPI's `StaticFiles` mount. API routes must be registered before the static mount in `backend/main.py`.

### Backend (`backend/`)

| File | Role |
|------|------|
| `main.py` | FastAPI app, CORS, router registration, static file mount |
| `database.py` | SQLite connection (WAL mode), `CREATE IF NOT EXISTS` migrations on import, `ensure_user()` seeds user + board + 5 default columns |
| `models.py` | Pydantic request/response models and structured AI output models (`AIResponse`, `BoardUpdate`, etc.) |
| `repository.py` | All DB CRUD — session management, board reads, card add/move/edit/delete, column rename |
| `routers/auth.py` | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| `routers/board.py` | `GET /api/board`, `PUT /api/board/columns/{id}/rename`, `POST /api/board/cards`, `PUT /api/board/cards/{id}`, `PUT /api/board/cards/{id}/move`, `DELETE /api/board/cards/{id}` |
| `routers/ai.py` | `POST /api/ai/test`, `POST /api/ai/chat` |
| `services/ai.py` | OpenRouter client via OpenAI SDK; `call_ai()` returns structured JSON |

All board and AI routes are protected with `get_current_user` dependency (returns 401 without valid session token).

**AI chat** (`POST /api/ai/chat`) loads board state from DB, maintains per-user in-memory conversation history (last 20 messages), calls OpenRouter with JSON mode, applies `BoardUpdate` mutations to the DB, and returns the AI's natural language reply plus the updated board.

### Frontend (`frontend/src/`)

| Path | Role |
|------|------|
| `lib/kanban.ts` | Types (`Card`, `Column`, `BoardData`), `moveCard()` pure function, `createId()` |
| `lib/api.ts` | Board API client (`fetchBoard`, `addCard`, `deleteCard`, `moveCard`, `renameColumn`, `editCard`) — includes auth token, returns `null` on 401 |
| `lib/auth.ts` | Auth API client (`login`, `logout`, `getMe`), token stored in `localStorage` |
| `lib/ai.ts` | AI API client (`sendMessage`) |
| `components/KanbanBoard.tsx` | Top-level board — fetches board on mount, manages all state, optimistic updates for all mutations, error/loading states, opens AI sidebar |
| `components/KanbanColumn.tsx` | Droppable column via `useDroppable`, wraps cards in `SortableContext` |
| `components/KanbanCard.tsx` | Sortable card via `useSortable` |
| `components/AIChatSidebar.tsx` | Sliding panel with message history, input, loading state; calls `onBoardUpdate` when AI modifies board |
| `components/AuthGuard.tsx` | Redirects to `/login` if no valid session |

Drag-and-drop uses `@dnd-kit` with `PointerSensor` (6px activation distance) and `closestCorners` collision detection.

### Database

SQLite at `data/kanban.db` (volume-mounted in Docker). 5 tables: `users`, `sessions`, `boards`, `columns`, `cards`. Text-based `column_id`/`card_id` fields are the frontend-facing identifiers; integer `id` columns are internal foreign keys. Schema auto-migrated with `CREATE IF NOT EXISTS` on every startup.

### Docker

Multi-stage build: Node 22 Alpine builds the static frontend, then Python 3.12 Alpine runs the backend with `uv`. Only port 8000 exposed. The `data/` directory is volume-mounted to persist the SQLite database across container restarts.

## Coding Standards

- No emojis anywhere in code or documentation
- No over-engineering — solve the actual problem, no hypothetical future requirements
- Identify root cause before fixing bugs; prove with evidence
- TypeScript strict mode on the frontend; Python type hints throughout the backend
- Frontend test coverage >= 80% (statements, branches, functions)
- AI model: `openai/gpt-oss-120b` via OpenRouter

## Color Scheme

CSS variables defined in `frontend/src/app/globals.css`:

- `accent-yellow`: `#ecad0a`
- `primary-blue`: `#209dd7`
- `secondary-purple`: `#753991`
- `navy-dark`: `#032147`
- `gray-text`: `#888888`
