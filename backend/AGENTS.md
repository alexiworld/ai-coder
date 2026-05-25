# Backend - Kanban Studio API

## Overview

This is a Python FastAPI backend for the Kanban Studio application. It serves the static NextJS frontend and provides REST API endpoints for authentication, board CRUD operations, and AI-powered chat.

## Key Technologies

- Python 3.12+
- FastAPI
- Uvicorn (ASGI server)
- Pydantic (data validation)
- SQLite (database)
- OpenAI SDK (OpenRouter AI calls)

## Architecture

### Current State (Part 2)
- Single `main.py` with FastAPI app
- `GET /api/health` - returns `{"status": "ok"}`
- `GET /` - serves a hello world HTML page

### Planned Endpoints
- `POST /api/auth/login` - authenticate user
- `POST /api/auth/logout` - invalidate session
- `GET /api/auth/me` - get current user
- `GET /api/board` - get user's board
- `PUT /api/board/columns/{columnId}/rename` - rename column
- `POST /api/board/cards` - add card
- `PUT /api/board/cards/{cardId}` - edit card
- `PUT /api/board/cards/{cardId}/move` - move card
- `DELETE /api/board/cards/{cardId}` - delete card
- `POST /api/ai/test` - test AI connectivity
- `POST /api/ai/chat` - AI chat with board context

### Project Structure
```
backend/
  main.py          - FastAPI app entry point
  database.py      - SQLite connection and table creation
  models.py        - Pydantic models for API
  repository.py    - Database CRUD operations
  routers/
    auth.py        - Authentication routes
    board.py       - Board CRUD routes
    ai.py          - AI chat routes
  services/
    ai.py          - OpenRouter AI integration
  pyproject.toml   - Python project config (uv)
  tests/
    test_*.py      - Backend tests
```

### Configuration
- Environment variables via `.env` file in project root
- `OPENROUTER_API_KEY` - API key for OpenRouter
- Database auto-created at `data/kanban.db` on startup
- Server runs on port 8000 inside Docker container