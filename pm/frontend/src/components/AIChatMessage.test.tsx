import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AIChatMessage } from "@/components/AIChatMessage";

describe("AIChatMessage", () => {
  it("renders user message on the right", () => {
    render(<AIChatMessage role="user" content="Hello from user" />);
    expect(screen.getByText("Hello from user")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("renders assistant message on the left", () => {
    render(<AIChatMessage role="assistant" content="Hello from AI" />);
    expect(screen.getByText("Hello from AI")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });
});
