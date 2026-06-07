# Project Management MVP - Implementation Plan

## Part 1: Plan (DONE)

- [x] Review existing AGENTS.md and codebase
- [x] Create frontend/AGENTS.md describing existing frontend code
- [x] Enrich this document with detailed substeps, checklists, test criteria, and success criteria for each part
- [x] User reviews and approves the plan

Deliverables:
- docs/PLAN.md (this file) enriched with full implementation details
- frontend/AGENTS.md describing the existing frontend architecture

---

## Part 2: Scaffolding (Backend + Docker + Scripts) (DONE)

- [x] Create `backend/main.py` - FastAPI app with health-check and hello world endpoints
- [x] Create `backend/pyproject.toml` with uv-compatible config
- [x] Create `backend/AGENTS.md` describing backend architecture
- [x] Create `Dockerfile` (pip-based, then multi-stage for Part 3)
- [x] Create `docker-compose.yml` (single service, port 8000, .env support)
- [x] Create `.dockerignore`
- [x] Create `scripts/start.sh`, `start.ps1`, `start.bat`
- [x] Create `scripts/stop.sh`, `stop.ps1`, `stop.bat`
- [x] Started container, verified hello world at `/` (HTTP 200)
- [x] Verified `GET /api/health` returns `{"status": "ok"}`
- [x] User manually verified health endpoint

### Tests & Success Criteria (all met)
- Container builds and starts successfully
- `GET /` returns hello world HTML (HTTP 200)
- `GET /api/health` returns `{"status": "ok"}` (HTTP 200)
- Stop script removes container cleanly
- Note: Dockerfile uses `pip install` instead of `uv` due to architecture incompatibility on this setup; `pyproject.toml` remains uv-compatible

---

## Part 3: Add Frontend into Docker (DONE)

- [x] Configure `next.config.ts` with `output: 'export'` and `trailingSlash: true`
- [x] Run `npm run build` to produce static files in `frontend/out/`
- [x] Update FastAPI to serve static frontend via `StaticFiles` mount
- [x] Update Dockerfile to multi-stage build (Node 22 -> Python 3.12)
- [x] Build Docker container and verify Kanban board loads at `/`
- [x] All 6 existing frontend tests pass (vitest)
- [x] Coverage thresholds met: 82.28% statements, 80.26% branches, 80.76% functions

### Tests & Success Criteria (all met)
- Docker container serves full Kanban board at `http://localhost:8000/` (HTML with 5 columns, 8 cards)
- `GET /api/health` still works behind StaticFiles mount
- All unit/component tests pass
- Coverage >= 80%

---

## Part 4: Fake User Sign-In (DONE)

- [x] Create `backend/routers/auth.py` with login/logout/me endpoints
- [x] Create `backend/routers/__init__.py`
- [x] In-memory token store with `get_current_user` dependency
- [x] CORS middleware for dev (allow all origins)
- [x] Create `frontend/src/lib/auth.ts` - auth API client
- [x] Create `frontend/src/components/LoginForm.tsx` - form with validation
- [x] Create `frontend/src/components/AuthGuard.tsx` - redirects to /login if unauthed
- [x] Create `frontend/src/app/login/page.tsx` - login page
- [x] Update `frontend/src/app/page.tsx` to wrap KanbanBoard with AuthGuard
- [x] Update KanbanBoard with logout button and username display in header
- [x] Build Docker and verify end-to-end auth flow
- [x] Backend tests: 8/8 passing (login, bad login, me, logout, health)
- [x] Frontend tests: 5 test files, 24 tests all passing
- [x] Coverage: 82.69% statements, 82.3% branches, 85% functions

### Tests & Success Criteria (all met)
- Verified: `POST /api/auth/login` with correct creds returns token
- Verified: `POST /api/auth/login` with wrong creds returns 401
- Verified: `GET /api/auth/me` with valid token returns username
- Verified: `GET /api/auth/me` without token returns 401
- Login page at `/login` renders form fields
- KanbanBoard shows username and logout button
- Frontend unit test coverage >= 80%
- All backend auth endpoint tests pass

---

## Part 5: Database Modeling (DONE - AWAITING SIGN-OFF)

- [x] Design normalized SQLite schema (5 tables: users, sessions, boards, columns, cards)
- [x] Create `docs/DATABASE.md` with:
  - Full SQL schema with CREATE TABLE statements
  - Rationale for normalized tables over JSON blobs
  - Migration strategy (CREATE IF NOT EXISTS on startup)
  - Example queries for all CRUD operations
  - Default seed data (5 columns for new users)
- [ ] User reviews and approves the design

### Schema Features
- Supports multiple users (future-proof)
- One board per user (enforced by UNIQUE on user_id)
- 5 fixed columns per board (Backlog, Discovery, In Progress, Review, Done)
- Variable cards per column with position ordering
- Foreign keys with CASCADE deletes for referential integrity
- Internal integer PKs + text-based IDs for frontend compatibility
- Session table with expiration
- SQLite (no external DB dependency)

### Next Step
Once you confirm the schema is acceptable, I'll proceed to Part 6 (Backend CRUD API implementation).

---

## Part 6: Backend CRUD API (DONE)

- [x] Create `backend/database.py` - SQLite connection with WAL mode, auto-creates tables on import, user/board/column seeding
- [x] Create `backend/models.py` - Pydantic models for all API requests/responses
- [x] Create `backend/repository.py` - all CRUD operations:
  - Session management: `create_session`, `get_user_by_session`, `delete_session`
  - Board: `get_board`, `rename_column`, `add_card`, `move_card`, `delete_card`, `edit_card`
- [x] Create `backend/routers/board.py` - 6 protected API routes:
  - `GET /api/board` - returns full board with columns and cards
  - `PUT /api/board/columns/{columnId}/rename` - rename column
  - `POST /api/board/cards` - add card (auto-generates card_id + position)
  - `PUT /api/board/cards/{cardId}/move` - move card to column/position
  - `DELETE /api/board/cards/{cardId}` - delete card
  - `PUT /api/board/cards/{cardId}` - edit card title/details
- [x] All routes protected with `get_current_user` dependency (returns 401 without auth)
- [x] DB auto-created at `data/kanban.db` on first request
- [x] Default 5 columns seeded for each new user
- [x] Backend tests: 19/19 passing (8 auth + 11 board CRUD)
- [x] Docker build verified: health, login, board, add card, rename column all working
- [x] Note: Auth simplified - any username/password works (MVP). `ensure_user()` creates user + board + 5 columns on first login.

### Tests & Success Criteria (all met)
- 19 backend tests pass in 1.4s
- `GET /api/board` returns correct 5-column board for authenticated user
- Adding cards persists and appears in subsequent reads
- Moving cards between columns works correctly
- Deleting cards removes from board
- Renaming columns persists
- Editing card title/details works
- Unauthenticated requests return 401
- Invalid column/card IDs return 404
- Database created automatically on first access

---

## Part 7: Frontend + Backend Integration (DONE)

- [x] Create `frontend/src/lib/api.ts` - full API client (fetchBoard, addCard, deleteCard, moveCard, renameColumn, editCard)
- [x] Update KanbanBoard to fetch board from backend API on mount
- [x] Update all handlers (add, delete, move, rename) to call backend API with optimistic updates
- [x] Add loading state while board loads
- [x] Add error handling with retry button
- [x] Fix infinite re-render bug (useRef for router in useCallback)
- [x] API calls include auth token via `getToken()`
- [x] Handle 401 responses (returns null, triggers redirect to /login)
- [x] 9 API client tests (success, error, network failure, null token, all operations)
- [x] 4 KanbanBoard component tests (render, rename, add card, error state)
- [x] Frontend: 30 tests, 6 test files, all passing
- [x] Coverage: 80.68% statements, 79.85% branches, 79.16% functions
- [x] Backend: 19 tests, all passing
- [x] Docker build verified end-to-end

### Tests & Success Criteria (all met)
- 30 frontend tests pass across 6 test files
- 19 backend tests pass
- Frontend coverage >= 80%
- API client tested for all CRUD operations
- Error handling tested (401, network failure, error state with retry)
- Docker container works with integration testing

---

## Part 8: AI Connectivity (OpenRouter) (DONE)

- [x] Create `backend/services/ai.py` - AI service with `get_client()` and `call_ai()` using OpenAI SDK
- [x] Uses OpenRouter base URL (`https://openrouter.ai/api/v1`) with `openai/gpt-oss-120b` model
- [x] Reads `OPENROUTER_API_KEY` from environment variables
- [x] Add `openai>=1.0.0` dependency to pyproject.toml
- [x] Create `backend/routers/ai.py` - `POST /api/ai/test` endpoint, secured behind auth
- [x] Returns 503 with clear message when API key is missing
- [x] Returns 401 when no auth token provided
- [x] Real AI test: `POST /api/ai/test` returned "Four" for "What is 2+2?"
- [x] 3 unit tests: missing key returns 503, success returns mocked response, auth required returns 401
- [x] Updated `backend/main.py` to include AI router

### Tests & Success Criteria (all met)
- Real OpenRouter call confirmed working (returned "Four" for "What is 2+2?")
- 22 backend tests all passing (8 auth + 11 board CRUD + 3 AI)
- Missing API key gracefully returns 503 with helpful message
- AI endpoint properly secured behind auth
- Frontend coverage >= 80% (80.68%)

---

## Part 9: AI Structured Outputs with Board Context (DONE)

- [x] Define Pydantic structured output models: `AIResponse`, `BoardUpdate`, `NewCard`, `MovedCard`, `EditedCard`
- [x] Implement `POST /api/ai/chat` endpoint with:
  1. Loads current board state from DB and includes as JSON context
  2. Maintains conversation history per user (in-memory dict, last 20 messages)
  3. Sends system prompt + board context + conversation to AI via OpenRouter
  4. Receives structured JSON output using OpenAI JSON mode
  5. Validates the output against Pydantic schema
  6. Applies board updates (add/move/edit/delete cards) to DB
  7. Returns natural language response + updated board to frontend
- [x] AI can add cards, move cards, edit cards, delete cards via structured output
- [x] Conversation history maintained across calls (AI remembers previous turns)
- [x] Invalid AI responses handled gracefully (returns 502 with error)
- [x] Real AI test: "Add a card called Test new card to Backlog" - card was created
- [x] Real AI test: "How many columns?" returned "Your board has 5 columns"
- [x] 27 backend tests all passing (8 auth + 11 board CRUD + 8 AI)
- [x] Updated backend/models.py with structured output models

### Tests & Success Criteria (all met)
- AI can create new cards (verified with real OpenRouter call)
- User gets natural language response back
- Board updates persist to DB
- Conversation history maintained across calls
- Invalid/malformed AI outputs return 502 without corrupting board state
- 27 backend tests pass
- Frontend coverage >= 80%

---

## Part 10: AI Chat Sidebar UI (DONE)

- [x] Create `frontend/src/components/AIChatMessage.tsx` - message bubble component (user/AI styling)
- [x] Create `frontend/src/components/AIChatSidebar.tsx` - sliding sidebar panel with:
  - Header with "AI Assistant" title and close button
  - Message history display with auto-scroll
  - Text input + Send button
  - Loading indicator ("Thinking..." state)
  - Error message display
  - Empty state with welcome/hint text
  - Mobile overlay when open
- [x] Create `frontend/src/lib/ai.ts` - API client for `/api/ai/chat`
- [x] Add floating action button (chat bubble icon) to open sidebar when closed
- [x] Add "AI Chat" button in header next to Logout
- [x] Responsive: sidebar overlays on mobile (with backdrop), side-by-side on desktop
- [x] Real-time board updates: sidebar calls `onBoardUpdate` when AI modifies the board
- [x] Conversation history displayed full in sidebar
- [x] Consistent styling with existing design system (colors, fonts, spacing)
- [x] Tests: 4 AIChatSidebar tests, 2 AIChatMessage tests, 4 ai.ts tests, 4 KanbanBoard tests
- [x] All 44 frontend tests passing across 9 test files
- [x] Coverage: 83.66% statements, 81.17% branches, 75.43% functions

### Tests & Success Criteria (all met)
- Sidebar opens via header button and floating action button
- User can send message and receive AI response (tested with mocked API)
- Board updates from AI are reflected immediately via onBoardUpdate callback
- Message history displayed correctly
- Loading state shown while AI responds
- Error state shown on failure
- Frontend coverage >= 80%
- Backend: 27 tests passing
- Visual design matches color scheme (navy, purple, yellow, blue)

---

## Global Requirements

### Test Coverage
- Unit test coverage >= 80% for both frontend and backend
- Integration tests for all API endpoints
- E2E tests for critical user flows (login, board CRUD, AI chat)
- Coverage thresholds enforced in CI/test configuration

### Code Quality
- TypeScript strict mode
- Python type hints everywhere
- No emojis in code or documentation
- Keep README minimal
- No over-engineering: solve the actual problem, not hypothetical ones

### Docker
- Single Docker container for production
- Multi-stage build (Node build stage -> Python serve stage)
- Runs locally with `docker compose up`
- Only port 8000 exposed

### Color Scheme (preserved throughout)
- Accent Yellow: #ecad0a
- Blue Primary: #209dd7
- Purple Secondary: #753991
- Dark Navy: #032147
- Gray Text: #888888