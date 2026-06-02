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

## Part 9: AI Structured Outputs with Board Context

**Goal:** Create an AI endpoint that receives the current board state + user question + conversation history, and returns structured output (response message + optional board updates).

### Sub-steps

1. Define structured output schema
   - [ ] Create Pydantic model for AI response:
     ```python
     class AIResponse(BaseModel):
       message: str  # Text response to the user
       board_updates: Optional[BoardUpdate]
     
     class BoardUpdate(BaseModel):
       add_cards: list[NewCard]
       move_cards: list[MovedCard]
       edit_cards: list[EditedCard]
       delete_card_ids: list[str]
     ```

2. Implement the AI service
   - [ ] `POST /api/ai/chat` endpoint that:
     1. Loads the current board state from DB
     2. Builds system prompt with board JSON context
     3. Sends user message + conversation history to AI
     4. Receives structured output
     5. Validates the output
     6. Applies board updates to DB (if any)
     7. Returns response message + updated board to frontend
   - [ ] Store conversation history per user session (in-memory or DB)

3. Test thoroughly
   - [ ] Unit tests with mocked AI responses
   - [ ] Test that board updates are correctly parsed and applied
   - [ ] Test invalid AI responses are handled gracefully
   - [ ] Test conversation history is maintained across calls
   - [ ] Integration test with real AI: "Move the card 'Align roadmap themes' to Done"

### Tests & Success Criteria
- AI can create new cards, move existing cards, edit card details, and delete cards
- Board updates are atomic (all-or-nothing within a single request)
- User gets a natural language response back
- Conversation history is maintained (AI remembers previous turns)
- Invalid/malformed AI outputs don't corrupt board state
- Backend test coverage >= 80%

---

## Part 10: AI Chat Sidebar UI

**Goal:** Add a beautiful sidebar widget to the Kanban board for AI chat. The sidebar allows full conversation and the AI can update the board dynamically.

### Sub-steps

1. Build the sidebar UI component
   - [ ] Create `frontend/src/components/AIChatSidebar.tsx` - sliding sidebar panel
   - [ ] Create `frontend/src/components/AIChatMessage.tsx` - individual message bubble
   - [ ] Create `frontend/src/components/AIChatInput.tsx` - text input + send button
   - [ ] Style consistently with existing design system (colors, fonts, spacing)

2. Add toggle button
   - [ ] Add floating action button to open/close the sidebar
   - [ ] Animate sidebar slide-in/out
   - [ ] Responsive: sidebar overlays on mobile, side-by-side on desktop

3. Integrate with backend AI endpoint
   - [ ] `frontend/src/lib/ai.ts` - API client for `/api/ai/chat`
   - [ ] Handle streaming response if supported, or full response
   - [ ] Manage loading state while AI responds
   - [ ] Handle errors in chat

4. Real-time board updates
   - [ ] After AI response, if board was modified, update the board state
   - [ ] Use the board response from the AI chat endpoint to refresh
   - [ ] Show visual feedback when board changes (e.g., highlight moved card)

5. Add message history
   - [ ] Display full conversation in sidebar
   - [ ] Persist conversation in session for the user
   - [ ] Show typing indicator while waiting for AI

6. Test the AI chat integration
   - [ ] Component tests for sidebar, messages, input
   - [ ] E2E test: open sidebar, send message, verify response appears
   - [ ] E2E test: ask AI to create a card, verify card appears on board
   - [ ] E2E test: ask AI to move a card, verify card moved

### Tests & Success Criteria
- Sidebar opens/closes smoothly
- User can send a message and receive AI response
- Board updates from AI are reflected immediately on the Kanban
- Sidebar works at all screen sizes
- Message history is displayed correctly
- Loading/error states are handled
- Frontend unit test coverage >= 80%
- E2E tests cover the full AI chat flow
- Visual design matches the existing color scheme and aesthetic

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