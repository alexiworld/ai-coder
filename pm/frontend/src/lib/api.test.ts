import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/lib/auth", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "@/lib/auth";
import {
  fetchBoard,
  listBoards,
  createBoard,
  renameBoard,
  deleteBoard,
  addCard,
  deleteCard,
  renameColumn,
  addColumn,
  deleteColumn,
  reorderColumns,
  moveCard,
  editCard,
  changePassword,
  listComments,
  addComment,
  deleteComment,
  listLabels,
  addLabel,
  deleteLabel,
} from "@/lib/api";

beforeEach(() => {
  mockFetch.mockReset();
  vi.mocked(getToken).mockReturnValue("test-token");
});

describe("API client", () => {
  it("fetchBoard returns board data", async () => {
    const boardData = {
      id: 1,
      name: "My Board",
      columns: [
        { id: "col-backlog", title: "Backlog", cardIds: [], color: null },
      ],
      cards: {},
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => boardData,
    });

    const result = await fetchBoard();
    expect(result).toEqual(boardData);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("fetchBoard returns null on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({ detail: "Unauthorized" }),
    });

    const result = await fetchBoard();
    expect(result).toBeNull();
  });

  it("addCard sends correct request with priority", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ card_id: "card-abc123" }),
    });

    const result = await addCard("col-backlog", "Test", "Details");
    expect(result).toEqual({ card_id: "card-abc123" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/cards",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          column_id: "col-backlog",
          title: "Test",
          details: "Details",
          priority: "medium",
        }),
      }),
    );
  });

  it("addCard supports custom priority and due date", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ card_id: "card-xyz" }),
    });

    await addCard("col-backlog", "Urgent", "Desc", "critical", "2026-07-01");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/cards",
      expect.objectContaining({
        body: JSON.stringify({
          column_id: "col-backlog",
          title: "Urgent",
          details: "Desc",
          priority: "critical",
          due_date: "2026-07-01",
        }),
      }),
    );
  });

  it("deleteCard sends correct request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await deleteCard("card-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/cards/card-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("renameColumn sends correct request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await renameColumn("col-backlog", "New Name");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/columns/col-backlog/rename",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ title: "New Name" }),
      }),
    );
  });

  it("moveCard sends correct request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await moveCard("card-1", "col-done");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/cards/card-1/move",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ target_column_id: "col-done" }),
      }),
    );
  });

  it("editCard sends correct request with fields object", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await editCard("card-1", { title: "New Title", details: "New Details" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/cards/card-1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ title: "New Title", details: "New Details" }),
      }),
    );
  });

  it("editCard supports priority and due_date fields", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await editCard("card-1", { priority: "high", due_date: "2026-08-01" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/cards/card-1",
      expect.objectContaining({
        body: JSON.stringify({ priority: "high", due_date: "2026-08-01" }),
      }),
    );
  });

  it("fetchBoard throws on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(fetchBoard()).rejects.toThrow("Network error");
  });

  it("fetchBoard returns null when no token", async () => {
    vi.mocked(getToken).mockReturnValue(null);

    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({ detail: "Unauthorized" }),
    });

    const result = await fetchBoard();
    expect(result).toBeNull();
  });

  it("fetchBoard with boardId routes to /api/boards/:id", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2, name: "B" }) });
    await fetchBoard(2);
    expect(mockFetch).toHaveBeenCalledWith("/api/boards/2", expect.any(Object));
  });

  it("listBoards returns board list", async () => {
    const boards = [{ id: 1, name: "My Board" }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => boards });
    const result = await listBoards();
    expect(result).toEqual(boards);
    expect(mockFetch).toHaveBeenCalledWith("/api/boards", expect.any(Object));
  });

  it("createBoard posts to /api/boards", async () => {
    const board = { id: 2, name: "Sprint 1" };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => board });
    const result = await createBoard("Sprint 1");
    expect(result).toEqual(board);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/boards",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Sprint 1" }) }),
    );
  });

  it("renameBoard sends PUT request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
    await renameBoard(1, "New Name");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/boards/1/name",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ name: "New Name" }) }),
    );
  });

  it("deleteBoard sends DELETE request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
    await deleteBoard(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/boards/1", expect.objectContaining({ method: "DELETE" }));
  });

  it("addColumn sends POST request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ column_id: "col-abc" }) });
    const result = await addColumn("QA");
    expect(result).toEqual({ column_id: "col-abc" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/columns",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ title: "QA", color: undefined }) }),
    );
  });

  it("deleteColumn sends DELETE request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
    await deleteColumn("col-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/columns/col-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("reorderColumns sends PUT request to /api/boards/:id/columns/reorder", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
    await reorderColumns(1, ["col-a", "col-b"]);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/boards/1/columns/reorder",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ column_ids: ["col-a", "col-b"] }),
      }),
    );
  });

  it("changePassword sends PUT request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
    await changePassword("old", "new123");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/me/password",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ current_password: "old", new_password: "new123" }),
      }),
    );
  });

  it("listComments sends GET request", async () => {
    const comments = [{ id: 1, username: "user", content: "hi", created_at: "2026-01-01" }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => comments });
    const result = await listComments(1, "card-1");
    expect(result).toEqual(comments);
    expect(mockFetch).toHaveBeenCalledWith("/api/boards/1/cards/card-1/comments", expect.any(Object));
  });

  it("addComment sends POST request", async () => {
    const comment = { id: 1, username: "user", content: "hello", created_at: "2026-01-01" };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => comment });
    const result = await addComment(1, "card-1", "hello");
    expect(result).toEqual(comment);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/boards/1/cards/card-1/comments",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ content: "hello" }) }),
    );
  });

  it("deleteComment sends DELETE request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
    await deleteComment(1, "card-1", 42);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/boards/1/cards/card-1/comments/42",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("listLabels sends GET request", async () => {
    const labels = [{ id: 1, label: "bug", color: "#ef4444" }];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => labels });
    const result = await listLabels(1, "card-1");
    expect(result).toEqual(labels);
    expect(mockFetch).toHaveBeenCalledWith("/api/boards/1/cards/card-1/labels", expect.any(Object));
  });

  it("addLabel sends POST request", async () => {
    const label = { id: 1, label: "bug", color: "#ef4444" };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => label });
    const result = await addLabel(1, "card-1", "bug", "#ef4444");
    expect(result).toEqual(label);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/boards/1/cards/card-1/labels",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ label: "bug", color: "#ef4444" }) }),
    );
  });

  it("deleteLabel sends DELETE request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok" }) });
    await deleteLabel(1, "card-1", 7);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/boards/1/cards/card-1/labels/7",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
