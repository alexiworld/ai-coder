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

## Part 5: Database Modeling

**Goal:** Propose and document a database schema for storing user + Kanban data using SQLite. Get user sign-off before implementation.

### Sub-steps

1. Design database schema
   - [ ] Tables:
     - `users` (id INTEGER PK, username TEXT UNIQUE, password_hash TEXT, created_at TIMESTAMP)
     - `sessions` (id TEXT PK, user_id INTEGER FK, created_at TIMESTAMP, expires_at TIMESTAMP)
     - `boards` (id INTEGER PK, user_id INTEGER FK, name TEXT, created_at TIMESTAMP, updated_at TIMESTAMP)
     - `columns` (id INTEGER PK, board_id INTEGER FK, column_id TEXT, title TEXT, position INTEGER, created_at TIMESTAMP)
     - `cards` (id INTEGER PK, column_id INTEGER FK, card_id TEXT, title TEXT, details TEXT, position INTEGER, created_at TIMESTAMP)

2. Document the approach
   - [ ] Create `docs/DATABASE.md` with:
     - Schema diagram (text-based)
     - Rationale for JSON vs normalized tables (recommend normalized for flexibility)
     - Migration strategy (auto-create on startup if not exists)
     - Example queries
   - [ ] Open for user review

3. Get user sign-off
   - [ ] Present to user, adjust based on feedback
   - [ ] Once approved, lock the schema

### Tests & Success Criteria
- Schema is documented in `docs/DATABASE.md`
- Schema supports: multiple users, one board per user, fixed columns, variable cards per column
- Schema uses SQLite (no external DB needed)
- User confirms the design before Part 6 implementation

---

## Part 6: Backend CRUD API

**Goal:** Implement the database + API routes for reading and modifying the Kanban board for a given user.

### Sub-steps

1. Implement database layer
   - [ ] Create `backend/database.py` - SQLite connection manager, auto-creates tables on import
   - [ ] Create `backend/models.py` - Pydantic models for API requests/responses
   - [ ] Create `backend/repository.py` - all DB operations (get board, add card, move card, rename column, delete card)

2. Implement API routes
   - [ ] `GET /api/board` - returns the full board for authenticated user (columns + cards)
   - [ ] `PUT /api/board/columns/:columnId/rename` - rename a column
   - [ ] `POST /api/board/cards` - add a card to a column
   - [ ] `PUT /api/board/cards/:cardId/move` - move card to a new column/position
   - [ ] `DELETE /api/board/cards/:cardId` - delete a card
   - [ ] `PUT /api/board/cards/:cardId` - edit card title/details

3. Add authentication dependency to all board routes
   - [ ] Protect all `/api/board/*` routes with token check
   - [ ] Return 401 for unauthenticated requests

4. Database auto-initialization
   - [ ] On first startup, create DB file if not exists
   - [ ] Seed default columns for a new user's board (Backlog, Discovery, In Progress, Review, Done)

5. Comprehensive backend tests
   - [ ] Test DB operations with in-memory SQLite
   - [ ] Test each API endpoint: success cases, edge cases, auth failures
   - [ ] Test board seeding for new user
   - [ ] Test card CRUD operations

### Tests & Success Criteria
- Backend test suite covers all API routes with at least 90% line coverage
- Tests use in-memory SQLite to isolate from dev database
- `GET /api/board` returns correct board for authenticated user
- Adding/moving/deleting cards persists to DB and reflects in subsequent reads
- Renaming columns persists
- Unauthenticated requests return 401
- Database file is created automatically on startup if missing

---

## Part 7: Frontend + Backend Integration

**Goal:** Connect the frontend to the backend API so the Kanban board is persistent.

### Sub-steps

1. Create frontend API client
   - [ ] Create `frontend/src/lib/api.ts` - functions for all CRUD operations:
     - `fetchBoard()` -> GET /api/board
     - `renameColumn(columnId, title)` -> PUT /api/board/columns/:columnId/rename
     - `addCard(columnId, title, details)` -> POST /api/board/cards
     - `moveCard(cardId, targetColumnId, targetPosition?)` -> PUT /api/board/cards/:cardId/move
     - `deleteCard(cardId)` -> DELETE /api/board/cards/:cardId
     - `editCard(cardId, title, details)` -> PUT /api/board/cards/:cardId

2. Update KanbanBoard to use API
   - [ ] Replace `useState(initialData)` with fetching from API on mount
   - [ ] Update all handlers (add, delete, move, rename) to call API then refresh board
   - [ ] Add loading state while board loads
   - [ ] Add error handling for API failures

3. Update auth flow
   - [ ] Ensure API calls include auth token
   - [ ] Handle 401 responses (redirect to login)

4. Update tests
   - [ ] Update component tests to mock API calls
   - [ ] Add integration test setup with MSW or similar
   - [ ] Ensure E2E tests pass against live backend

5. Verify persistence
   - [ ] Add card, refresh page, card is still there
   - [ ] Move card, refresh, position is preserved
   - [ ] Delete card, refresh, card is gone

### Tests & Success Criteria
- All existing frontend tests pass (updated for API integration)
- New tests for API client functions
- New component tests with mocked API responses
- E2E tests pass against Docker container
- Board state persists across page refreshes
- Frontend unit test coverage >= 80%
- Backend unit test coverage >= 80%

---

## Part 8: AI Connectivity (OpenRouter)

**Goal:** Add backend AI call capability via OpenRouter. Verify with a simple test.

### Sub-steps

1. Add OpenRouter API integration
   - [ ] Create `backend/services/ai.py` with:
     - `call_ai(messages, response_format)` function
     - Uses `openai` Python SDK with OpenRouter base URL
     - Reads `OPENROUTER_API_KEY` from environment
     - Uses `openai/gpt-oss-120b` model
   - [ ] Add `openai` dependency to pyproject.toml

2. Add test endpoint
   - [ ] `POST /api/ai/test` - simple endpoint that asks AI "What is 2+2?" and returns the response
   - [ ] Secure behind auth

3. Test AI connectivity
   - [ ] Run test endpoint against real OpenRouter (requires .env with API key)
   - [ ] Verify response is "4" or equivalent
   - [ ] Handle errors gracefully (API key missing, network issues)

4. Add unit tests with mocked AI calls
   - [ ] Mock the OpenAI client for unit tests
   - [ ] Test error handling paths

### Tests & Success Criteria
- `POST /api/ai/test` returns a valid response from OpenRouter
- Test confirms the AI correctly answers 2+2
- Unit tests with mocked OpenAI client pass
- Graceful error when API key is missing (returns 503 with clear message)
- Backend test coverage remains >= 80%

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