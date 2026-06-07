import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/lib/auth", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "@/lib/auth";
import { fetchBoard, addCard, deleteCard, renameColumn, moveCard, editCard } from "@/lib/api";

beforeEach(() => {
  mockFetch.mockReset();
  vi.mocked(getToken).mockReturnValue("test-token");
});

describe("API client", () => {
  it("fetchBoard returns board data", async () => {
    const boardData = {
      columns: [
        { id: "col-backlog", title: "Backlog", cardIds: [] },
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

  it("addCard sends correct request", async () => {
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
        body: JSON.stringify({ target_column_id: "col-done", position: undefined }),
      }),
    );
  });

  it("editCard sends correct request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    await editCard("card-1", "New Title", "New Details");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/board/cards/card-1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ title: "New Title", details: "New Details" }),
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
});
