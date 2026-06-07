import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/lib/auth", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "@/lib/auth";
import { sendChatMessage } from "@/lib/ai";

beforeEach(() => {
  mockFetch.mockReset();
  vi.mocked(getToken).mockReturnValue("test-token");
});

describe("AI chat client", () => {
  it("returns chat result on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: "Hello!",
        board: { columns: [], cards: {} },
      }),
    });

    const result = await sendChatMessage("Hi");
    expect(result).toEqual({
      message: "Hello!",
      board: { columns: [], cards: {} },
    });
  });

  it("returns null on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({ detail: "Unauthorized" }),
    });

    const result = await sendChatMessage("Hi");
    expect(result).toBeNull();
  });

  it("returns null when no token", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    const result = await sendChatMessage("Hi");
    expect(result).toBeNull();
  });

  it("throws on error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    await expect(sendChatMessage("Hi")).rejects.toThrow("Network error");
  });
});