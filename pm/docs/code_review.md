# Code Review

Reviewed: 2026-06-24
Scope: full repo — backend (Python/FastAPI), frontend (Next.js/React), tests, infra

---

## Summary

The MVP is well-structured and clean for its scope. The layering (routers → repository → database) is clear, the frontend state management is straightforward, and the test coverage is solid. The findings below are ranked by impact. None are blockers for the current MVP usage, but several would cause real problems at scale or with more users.

---

## High Priority

### 1. Column rename fires an API call on every keystroke

**File:** `frontend/src/components/KanbanColumn.tsx:43`

The column title `<input>` calls `onRename` via `onChange`, which propagates to `handleRenameColumn` in `KanbanBoard`, which immediately calls `apiRenameColumn`. Typing "Backlog" triggers 7 API calls. Under any load this hammers the backend and creates race conditions where out-of-order responses could revert the title mid-type.

**Fix:** Debounce the API call (e.g. 400ms), or switch to `onBlur`/enter-to-confirm.

---

### 2. `handleAddCard` uses stale `router` instead of `routerRef`

**File:** `frontend/src/components/KanbanBoard.tsx:153`

`KanbanBoard` uses a `routerRef` pattern specifically to avoid stale closure issues with `router` in `useCallback`. But `handleAddCard` still references `router` directly on the 401 redirect path:

```ts
router.replace("/login");  // line 153 — should be routerRef.current.replace
```

All other redirect paths use `routerRef.current`. This is inconsistent and will trigger the same stale-closure bug that motivated `routerRef` in the first place.

---

### 3. `init_db` called on every board request

**File:** `backend/routers/board.py:24-27`

`_get_db_and_user` calls `init_db(conn)` which executes all `CREATE TABLE IF NOT EXISTS` statements on every API request. This is idempotent but runs unnecessary SQL on every call. `init_db` should be called once at application startup in `main.py`, not per-request.

---

### 4. `_apply_updates` is not atomic

**File:** `backend/routers/ai.py:61-77`

The AI can return a `BoardUpdate` with multiple operations (add, move, edit, delete). These are applied sequentially without a wrapping transaction. If `add_card` succeeds for two cards and then `move_card` fails, the board is left in a partially-updated state with no rollback.

**Fix:** Wrap `_apply_updates` in a single transaction: pass the connection to each repo function and commit once at the end (or rollback on any failure).

---

### 5. CORS misconfiguration

**File:** `backend/main.py:14-21`

```python
allow_origins=["*"],
allow_credentials=True,
```

The CORS spec forbids `allow_credentials=True` with a wildcard origin. Browsers will refuse to send cookies/auth headers in this configuration. FastAPI itself emits a warning about this. It works in the current setup only because the frontend and backend share the same origin (port 8000) in production, so CORS isn't actually exercised. But it would silently break any cross-origin dev setup.

**Fix:** Either set `allow_credentials=False` (the token is sent as a header, not a cookie, so this is sufficient), or restrict to an explicit origin list.

---

## Medium Priority

### 6. `handleAddCard` silently replaces empty details with a placeholder

**File:** `frontend/src/components/KanbanBoard.tsx:148-149`

```ts
details: details || "No details yet.",
```

A user who intentionally leaves details blank will see "No details yet." appear on their card. The empty string is a valid value and should be sent as-is.

---

### 7. AI system prompt hardcodes column names that can be renamed

**File:** `backend/routers/ai.py:39`

```
Available columns: Backlog, Discovery, In Progress, Review, Done
```

This is wrong as soon as a user renames a column. The board state JSON is passed as context on every message, so the AI can read the actual column names from there — but the system prompt contradicts it. Remove the hardcoded list from the system prompt; the board JSON provides all the context needed.

---

### 8. `max_tokens=500` will truncate complex AI responses

**File:** `backend/services/ai.py:29`

500 tokens is tight for a response that includes JSON board updates for multiple cards. A board update adding 5 cards with titles and details could easily exceed this. The response gets silently truncated, causing a JSON parse error that returns 502 to the user.

**Fix:** Raise to at least 1500–2000 tokens.

---

### 9. `get_client()` called twice per AI request

**File:** `backend/routers/ai.py:83` and `backend/services/ai.py:20`

`_get_ai_response` calls `get_client()` to check for `None`, then `call_ai` calls `get_client()` again internally. This instantiates two `OpenAI` client objects per request. Pass the client as a parameter or check the env var directly.

---

### 10. Dead code in `kanban.ts`

**File:** `frontend/src/lib/kanban.ts:18-72, 164-168`

`initialData` (the hardcoded 8-card demo board) and `createId` (frontend ID generator) are both unused in the connected app — card IDs are now generated by the backend. `initialData` is used in some unit tests but those tests could use minimal inline fixtures instead. Both should be removed to avoid confusion about the data model.

---

### 11. `ensure_user` called on every board operation

**File:** `backend/repository.py` — every exported function

Every repo function (`get_board`, `rename_column`, `add_card`, etc.) calls `ensure_user(conn, username)`, which does a `SELECT` on `users`. The username is already validated by `get_current_user` (which confirmed a live session), so the user is guaranteed to exist. The `ensure_user` pattern makes sense in the auth router (first login), but not in every board operation.

**Fix:** Accept `user_id: int` as a parameter in repo functions, resolving it once per request in the router.

---

### 12. Conversation history lost on server restart

**File:** `backend/routers/ai.py:27`

`conversations: dict[str, list[dict]] = {}` is in-memory. Every container restart wipes all chat history. Users get a clean chat with no memory, which is surprising mid-conversation. For the MVP this is noted but acceptable; for any production use, history needs to persist to the database.

---

## Low Priority

### 13. `ai.ts` has a redundant catch-rethrow

**File:** `frontend/src/lib/ai.ts:37-39`

```ts
} catch (e) {
  throw e;
}
```

This catch block re-throws without any handling. It adds no value — removing it leaves behaviour identical.

---

### 14. Chat message list uses array index as key

**File:** `frontend/src/components/AIChatSidebar.tsx:132`

```tsx
{messages.map((msg, i) => <AIChatMessage key={i} .../>)}
```

Index keys cause unnecessary re-renders if messages are ever removed from the middle. Since messages only append this is harmless today, but a stable key (e.g. `msg.id` with a counter) is better practice.

---

### 15. No UI for card editing

Card editing (`PUT /api/board/cards/{cardId}`) is implemented in the backend and in `src/lib/api.ts` but there is no UI that exposes it directly — the only way to edit a card is via the AI sidebar. This is either a planned gap or an oversight.

---

### 16. `password_hash` stores a literal `"placeholder"`

**File:** `backend/database.py:93`

```python
(username, "placeholder"),
```

This is appropriate for the MVP (no password verification) but would need to be replaced with real hashing before any real auth is added. The field name `password_hash` implies it's hashed when it isn't.

---

## Positive Observations

- **Repository pattern is clean.** `repository.py` keeps all SQL in one place with consistent parameterization. No SQL injection risk.
- **Optimistic updates are consistent.** Every mutation updates local state immediately and falls back to a full reload on error — the right pattern for this app.
- **Test isolation is good.** Board tests use `secrets.token_hex(4)` usernames to avoid state leakage between tests.
- **Auth token handled correctly.** `get_user_by_session` checks expiry on read and deletes expired tokens inline. Sessions are properly scoped per user.
- **Docker build is efficient.** Multi-stage build correctly separates the Node build step from the Python runtime, keeping the final image small.
- **Error states are handled end-to-end.** Loading, error with retry, 401 redirect, and AI failure states all have explicit UI — nothing silently fails.
