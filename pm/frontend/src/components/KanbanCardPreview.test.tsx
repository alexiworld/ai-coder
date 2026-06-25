import { render, screen } from "@testing-library/react";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { describe, it, expect } from "vitest";

const baseCard = {
  id: "card-1",
  title: "Test Card",
  details: "Card details",
  priority: "medium" as const,
  due_date: null,
};

describe("KanbanCardPreview", () => {
  it("renders card title", () => {
    render(<KanbanCardPreview card={baseCard} />);
    expect(screen.getByText("Test Card")).toBeInTheDocument();
  });

  it("renders card details", () => {
    render(<KanbanCardPreview card={baseCard} />);
    expect(screen.getByText("Card details")).toBeInTheDocument();
  });

  it("does not show priority badge for medium priority", () => {
    render(<KanbanCardPreview card={baseCard} />);
    expect(screen.queryByText(/medium/i)).not.toBeInTheDocument();
  });

  it("shows priority badge for high priority", () => {
    render(<KanbanCardPreview card={{ ...baseCard, priority: "high" }} />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it("shows priority badge for critical", () => {
    render(<KanbanCardPreview card={{ ...baseCard, priority: "critical" }} />);
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it("shows priority badge for low", () => {
    render(<KanbanCardPreview card={{ ...baseCard, priority: "low" }} />);
    expect(screen.getByText(/low/i)).toBeInTheDocument();
  });

  it("does not show details section when empty", () => {
    render(<KanbanCardPreview card={{ ...baseCard, details: "" }} />);
    expect(screen.queryByText("Card details")).not.toBeInTheDocument();
  });
});
