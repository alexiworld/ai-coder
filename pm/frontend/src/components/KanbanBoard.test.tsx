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

vi.mock("@/components/CardDetailModal", () => ({
  CardDetailModal: ({
    card,
    onClose,
    onSave,
  }: {
    card: { id: string; title: string };
    onClose: () => void;
    onSave: (id: string, fields: object) => Promise<void>;
  }) => (
    <div data-testid="card-detail-modal">
      <span>{card.title}</span>
      <button onClick={() => onSave(card.id, { title: "Updated Title" }).then(onClose)}>Save Modal</button>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

const mockBoardData = {
  id: 1,
  name: "My Board",
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"], color: null },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"], color: null },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4", "card-5"], color: null },
    { id: "col-review", title: "Review", cardIds: ["card-6"], color: null },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"], color: null },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Card 1", details: "Details 1", priority: "medium", due_date: null },
    "card-2": { id: "card-2", title: "Card 2", details: "Details 2", priority: "medium", due_date: null },
    "card-3": { id: "card-3", title: "Card 3", details: "Details 3", priority: "high", due_date: null },
    "card-4": { id: "card-4", title: "Card 4", details: "Details 4", priority: "medium", due_date: null },
    "card-5": { id: "card-5", title: "Card 5", details: "Details 5", priority: "low", due_date: null },
    "card-6": { id: "card-6", title: "Card 6", details: "Details 6", priority: "critical", due_date: "2026-07-01" },
    "card-7": { id: "card-7", title: "Card 7", details: "Details 7", priority: "medium", due_date: null },
    "card-8": { id: "card-8", title: "Card 8", details: "Details 8", priority: "medium", due_date: null },
  },
};

const mockBoardsList = [
  { id: 1, name: "My Board", created_at: "2026-01-01T00:00:00", column_count: 5, card_count: 8 },
];

function mockJsonResponse(data: unknown) {
  return { ok: true, json: async () => data };
}

describe("KanbanBoard", () => {
  beforeEach(() => {
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, options: RequestInit = {}) => {
        if (url === "/api/boards") {
          return Promise.resolve(mockJsonResponse(mockBoardsList));
        }
        if (url === "/api/board" || url === "/api/board/") {
          return Promise.resolve(mockJsonResponse(mockBoardData));
        }
        if (url.match(/^\/api\/boards\/\d+$/) && (!options.method || options.method === "GET")) {
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
      expect(screen.getAllByTestId(/^column-col-/i)).toHaveLength(5);
    });
  });

  it("renders board name in selector", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByTestId("board-selector-trigger")).toHaveTextContent("My Board");
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

    const titleInput = await within(column).findByPlaceholderText(/card title/i);
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

  it("shows error state when board fetch fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/boards") {
        return Promise.resolve(mockJsonResponse(mockBoardsList));
      }
      return Promise.reject(new Error("Network error"));
    });

    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows priority badge for high priority cards", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByTestId("priority-high")).toBeInTheDocument();
    });
  });

  it("shows critical priority badge", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByTestId("priority-critical")).toBeInTheDocument();
    });
  });

  it("shows due date for cards with due date", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByTestId("due-date")).toBeInTheDocument();
    });
  });

  it("shows add column button", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add column/i })).toBeInTheDocument();
    });
  });

  it("shows search filter bar", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByTestId("search-filter-bar")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });
  });

  it("shows priority filter buttons", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByTestId("filter-low")).toBeInTheDocument();
      expect(screen.getByTestId("filter-high")).toBeInTheDocument();
      expect(screen.getByTestId("filter-critical")).toBeInTheDocument();
    });
  });

  it("shows clear filters button when search has text", async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByTestId("search-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("search-input"), "test query");
    expect(screen.getByTestId("clear-filters")).toBeInTheDocument();
  });

  it("shows profile button in header", async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /profile/i })).toBeInTheDocument();
    });
  });

  it("toggles priority filter on click and shows clear button", async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByTestId("filter-high")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("filter-high"));
    expect(screen.getByTestId("clear-filters")).toBeInTheDocument();
  });

  it("clears filters on clear button click", async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByTestId("filter-low")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("filter-low"));
    expect(screen.getByTestId("clear-filters")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("clear-filters"));
    expect(screen.queryByTestId("clear-filters")).not.toBeInTheDocument();
  });

  it("opens card modal when card body is clicked", async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByTestId("card-card-3")).toBeInTheDocument());
    const cardBody = within(screen.getByTestId("card-card-3")).getByRole("button", {
      name: /edit card 3/i,
    });
    await userEvent.click(cardBody);
    await waitFor(() => {
      expect(screen.getByTestId("card-detail-modal")).toBeInTheDocument();
    });
  });

  it("closes card modal on close", async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByTestId("card-card-3")).toBeInTheDocument());
    const cardBody = within(screen.getByTestId("card-card-3")).getByRole("button", {
      name: /edit card 3/i,
    });
    await userEvent.click(cardBody);
    await waitFor(() => expect(screen.getByTestId("card-detail-modal")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /close modal/i }));
    expect(screen.queryByTestId("card-detail-modal")).not.toBeInTheDocument();
  });

  it("saves card edit via modal", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, options: RequestInit = {}) => {
      if (url === "/api/boards") return Promise.resolve(mockJsonResponse(mockBoardsList));
      if (url === "/api/board" || url === "/api/board/") return Promise.resolve(mockJsonResponse(mockBoardData));
      if (url.match(/^\/api\/boards\/\d+$/) && (!options.method || options.method === "GET"))
        return Promise.resolve(mockJsonResponse(mockBoardData));
      return Promise.resolve(mockJsonResponse({ status: "ok" }));
    });

    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByTestId("card-card-3")).toBeInTheDocument());
    const cardBody = within(screen.getByTestId("card-card-3")).getByRole("button", {
      name: /edit card 3/i,
    });
    await userEvent.click(cardBody);
    await waitFor(() => expect(screen.getByTestId("card-detail-modal")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /save modal/i }));
    await waitFor(() => expect(screen.queryByTestId("card-detail-modal")).not.toBeInTheDocument());
  });

  it("calls logout when logout button clicked", async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    vi.mocked(await import("@/lib/auth")).logout = mockLogout;

    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  it("deletes a card when delete button clicked", async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByTestId("card-card-1")).toBeInTheDocument());
    const deleteBtn = within(screen.getByTestId("card-card-1")).getByRole("button", {
      name: /delete card 1/i,
    });
    await userEvent.click(deleteBtn);
    await waitFor(() => expect(screen.queryByTestId("card-card-1")).not.toBeInTheDocument());
  });
});
