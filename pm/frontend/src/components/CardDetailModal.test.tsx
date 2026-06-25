import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardDetailModal } from "@/components/CardDetailModal";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockCard = {
  id: "card-1",
  title: "Test Card",
  details: "Some details",
  priority: "high" as const,
  due_date: "2026-08-01",
};

describe("CardDetailModal", () => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
    onSave.mockReset();
    onSave.mockResolvedValue(undefined);
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
});
