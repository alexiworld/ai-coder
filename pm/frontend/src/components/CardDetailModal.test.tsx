import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardDetailModal } from "@/components/CardDetailModal";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  listComments: vi.fn().mockResolvedValue([]),
  addComment: vi.fn().mockResolvedValue({ id: 1, username: "user", content: "hello", created_at: "2026-01-01" }),
  deleteComment: vi.fn().mockResolvedValue({ status: "ok" }),
  listLabels: vi.fn().mockResolvedValue([]),
  addLabel: vi.fn().mockResolvedValue({ id: 1, label: "bug", color: "#ef4444" }),
  deleteLabel: vi.fn().mockResolvedValue({ status: "ok" }),
}));

import { listComments, addComment, deleteComment, listLabels, addLabel, deleteLabel } from "@/lib/api";

const mockCard = {
  id: "card-1",
  title: "Test Card",
  details: "Some details",
  priority: "high" as const,
  due_date: "2026-08-01",
  labels: [],
  comment_count: 0,
};

describe("CardDetailModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onSave.mockReset();
    onSave.mockResolvedValue(undefined);
    vi.mocked(listComments).mockReset();
    vi.mocked(listComments).mockResolvedValue([]);
    vi.mocked(addComment).mockReset();
    vi.mocked(addComment).mockResolvedValue({ id: 1, username: "user", content: "hello", created_at: "2026-01-01" });
    vi.mocked(deleteComment).mockReset();
    vi.mocked(deleteComment).mockResolvedValue({ status: "ok" });
    vi.mocked(listLabels).mockReset();
    vi.mocked(listLabels).mockResolvedValue([]);
    vi.mocked(addLabel).mockReset();
    vi.mocked(addLabel).mockResolvedValue({ id: 1, label: "bug", color: "#ef4444" });
    vi.mocked(deleteLabel).mockReset();
    vi.mocked(deleteLabel).mockResolvedValue({ status: "ok" });
  });

  it("renders with card data pre-filled", () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);

    expect(screen.getByTestId("modal-title-input")).toHaveValue("Test Card");
    expect(screen.getByTestId("modal-details-input")).toHaveValue("Some details");
    expect(screen.getByTestId("modal-due-date-input")).toHaveValue("2026-08-01");
    expect(screen.getByTestId("priority-btn-high")).toHaveStyle({ backgroundColor: "rgb(249, 115, 22)" });
  });

  it("calls onSave with updated fields on save", async () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);

    const titleInput = screen.getByTestId("modal-title-input");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Title");

    await userEvent.click(screen.getByTestId("save-card-btn"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("card-1", {
        title: "Updated Title",
        details: "Some details",
        priority: "high",
        due_date: "2026-08-01",
      });
    });
  });

  it("calls onClose after successful save", async () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("save-card-btn"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows error if title is empty", async () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    const titleInput = screen.getByTestId("modal-title-input");
    await userEvent.clear(titleInput);
    await userEvent.click(screen.getByTestId("save-card-btn"));
    expect(screen.getByTestId("modal-error")).toHaveTextContent("Title is required");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onClose when cancel button clicked", async () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when X button clicked", async () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("can change priority", async () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("priority-btn-critical"));
    await userEvent.click(screen.getByTestId("save-card-btn"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("card-1", expect.objectContaining({ priority: "critical" }));
    });
  });

  it("can clear due date", async () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("clear-due-date"));
    expect(screen.getByTestId("modal-due-date-input")).toHaveValue("");
  });

  it("handles card with no due date", () => {
    const cardNoDue = { ...mockCard, due_date: null };
    render(<CardDetailModal card={cardNoDue} onClose={onClose} onSave={onSave} />);
    expect(screen.getByTestId("modal-due-date-input")).toHaveValue("");
  });

  it("shows error message when save fails", async () => {
    onSave.mockRejectedValue(new Error("Network error"));
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("save-card-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("modal-error")).toHaveTextContent("Network error");
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("is accessible with testid", () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    expect(screen.getByTestId("card-detail-modal")).toBeInTheDocument();
  });

  it("fetches comments and labels on mount when boardId provided", async () => {
    render(<CardDetailModal card={mockCard} boardId={1} onClose={onClose} onSave={onSave} />);
    await waitFor(() => {
      expect(listComments).toHaveBeenCalledWith(1, "card-1");
      expect(listLabels).toHaveBeenCalledWith(1, "card-1");
    });
  });

  it("does not fetch comments/labels when no boardId", () => {
    render(<CardDetailModal card={mockCard} onClose={onClose} onSave={onSave} />);
    expect(listComments).not.toHaveBeenCalled();
    expect(listLabels).not.toHaveBeenCalled();
  });

  it("adds a comment", async () => {
    render(<CardDetailModal card={mockCard} boardId={1} onClose={onClose} onSave={onSave} />);
    const input = screen.getByTestId("comment-input");
    await userEvent.type(input, "hello");
    await userEvent.click(screen.getByTestId("add-comment-btn"));
    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith(1, "card-1", "hello");
    });
    expect(screen.getByTestId("comment-1")).toBeInTheDocument();
  });

  it("deletes a comment", async () => {
    vi.mocked(listComments).mockResolvedValueOnce([
      { id: 5, username: "alice", content: "test", created_at: "2026-01-01" },
    ]);
    render(<CardDetailModal card={mockCard} boardId={1} onClose={onClose} onSave={onSave} />);
    await waitFor(() => expect(screen.getByTestId("comment-5")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("delete-comment-5"));
    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith(1, "card-1", 5);
      expect(screen.queryByTestId("comment-5")).not.toBeInTheDocument();
    });
  });

  it("adds a label", async () => {
    render(<CardDetailModal card={mockCard} boardId={1} onClose={onClose} onSave={onSave} />);
    const input = screen.getByTestId("label-input");
    await userEvent.type(input, "bug");
    await userEvent.click(screen.getByTestId("add-label-btn"));
    await waitFor(() => {
      expect(addLabel).toHaveBeenCalledWith(1, "card-1", "bug", expect.any(String));
    });
    expect(screen.getByTestId("label-1")).toBeInTheDocument();
  });

  it("deletes a label", async () => {
    vi.mocked(listLabels).mockResolvedValueOnce([
      { id: 3, label: "urgent", color: "#ef4444" },
    ]);
    render(<CardDetailModal card={mockCard} boardId={1} onClose={onClose} onSave={onSave} />);
    await waitFor(() => expect(screen.getByTestId("label-3")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("delete-label-3"));
    await waitFor(() => {
      expect(deleteLabel).toHaveBeenCalledWith(1, "card-1", 3);
      expect(screen.queryByTestId("label-3")).not.toBeInTheDocument();
    });
  });
});
