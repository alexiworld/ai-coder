import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanBoard } from "@/components/KanbanBoard";
import { vi, beforeEach, describe, it, expect } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  logout: vi.fn(),
  getUsername: () => "user",
  getToken: () => "test-token",
}));

vi.mock("@/components/AIChatSidebar", () => ({
  AIChatSidebar: () => null,
}));

const mockBoardData = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4", "card-5"] },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Card 1", details: "Details 1" },
    "card-2": { id: "card-2", title: "Card 2", details: "Details 2" },
    "card-3": { id: "card-3", title: "Card 3", details: "Details 3" },
    "card-4": { id: "card-4", title: "Card 4", details: "Details 4" },
    "card-5": { id: "card-5", title: "Card 5", details: "Details 5" },
    "card-6": { id: "card-6", title: "Card 6", details: "Details 6" },
    "card-7": { id: "card-7", title: "Card 7", details: "Details 7" },
    "card-8": { id: "card-8", title: "Card 8", details: "Details 8" },
  },
};

function mockJsonResponse(data: unknown) {
  return { ok: true, json: async () => data };
}

describe("KanbanBoard", () => {
  beforeEach(() => {
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, options: RequestInit = {}) => {
        if (url === "/api/board" || url === "/api/board/") {
          return Promise.resolve(mockJsonResponse(mockBoardData));
        }
        if (
          url === "/api/board/cards" &&
          (options.method === "POST" || !options.method)
        ) {
          return Promise.resolve(mockJsonResponse({ card_id: "card-new-1" }));
        }
        if (url.includes("/api/board/cards/") && options.method === "DELETE") {
          return Promise.resolve(mockJsonResponse({ status: "ok" }));
        }
        if (url.includes("/rename")) {
          return Promise.resolve(mockJsonResponse({ status: "ok" }));
        }
        return Promise.resolve(mockJsonResponse(mockBoardData));
      });
  });

  it("renders five columns", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
    });
  });

  it("renames a column", async () => {
    render(<KanbanBoard />);
    const input = await screen.findByDisplayValue("Backlog");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    expect(input).toHaveValue("New Name");
  });

  it("adds a card", async () => {
    render(<KanbanBoard />);
    const column = await screen.findByTestId("column-col-backlog");

    const addButton = within(column).getByRole("button", {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput =
      await within(column).findByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, "New card");
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, "Notes");

    await userEvent.click(
      within(column).getByRole("button", { name: /add card/i }),
    );

    await waitFor(() => {
      expect(within(column).getByText("New card")).toBeInTheDocument();
    });
  });

  it("shows error state when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    // Retry button should be present
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
