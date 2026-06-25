import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardSelector } from "@/components/BoardSelector";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockBoards = [
  { id: 1, name: "My Board", created_at: "2026-01-01", column_count: 5, card_count: 3 },
  { id: 2, name: "Sprint Board", created_at: "2026-01-02", column_count: 3, card_count: 1 },
];

const defaultProps = {
  boards: mockBoards,
  currentBoardId: 1,
  currentBoardName: "My Board",
  onSelectBoard: vi.fn(),
  onCreateBoard: vi.fn(),
  onDeleteBoard: vi.fn(),
  onRenameBoard: vi.fn(),
};

describe("BoardSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders current board name in trigger", () => {
    render(<BoardSelector {...defaultProps} />);
    expect(screen.getByTestId("board-selector-trigger")).toHaveTextContent("My Board");
  });

  it("opens dropdown on trigger click", async () => {
    render(<BoardSelector {...defaultProps} />);
    await userEvent.click(screen.getByTestId("board-selector-trigger"));
    expect(screen.getByText("Sprint Board")).toBeInTheDocument();
  });

  it("calls onSelectBoard when a board is selected", async () => {
    render(<BoardSelector {...defaultProps} />);
    await userEvent.click(screen.getByTestId("board-selector-trigger"));
    await userEvent.click(screen.getByText("Sprint Board"));
    expect(defaultProps.onSelectBoard).toHaveBeenCalledWith(2);
  });

  it("can create a new board", async () => {
    render(<BoardSelector {...defaultProps} />);
    await userEvent.click(screen.getByTestId("board-selector-trigger"));
    await userEvent.click(screen.getByRole("button", { name: /new board/i }));
    const input = screen.getByPlaceholderText(/board name/i);
    await userEvent.type(input, "New Project");
    await userEvent.keyboard("{Enter}");
    expect(defaultProps.onCreateBoard).toHaveBeenCalledWith("New Project");
  });

  it("shows delete button only when multiple boards exist", async () => {
    render(<BoardSelector {...defaultProps} />);
    await userEvent.click(screen.getByTestId("board-selector-trigger"));
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it("does not show delete when only one board", async () => {
    render(<BoardSelector {...defaultProps} boards={[mockBoards[0]]} />);
    await userEvent.click(screen.getByTestId("board-selector-trigger"));
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("closes on outside click", async () => {
    render(
      <div>
        <BoardSelector {...defaultProps} />
        <button>Outside</button>
      </div>,
    );
    await userEvent.click(screen.getByTestId("board-selector-trigger"));
    expect(screen.getByText("Sprint Board")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Outside" }));
    await waitFor(() => {
      expect(screen.queryByText("Sprint Board")).not.toBeInTheDocument();
    });
  });
});
