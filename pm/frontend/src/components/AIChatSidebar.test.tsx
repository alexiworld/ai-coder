import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOnBoardUpdate = vi.fn();
const mockOnClose = vi.fn();

vi.mock("@/lib/ai", () => ({
  sendChatMessage: vi.fn(),
}));

vi.mock("@/components/AIChatMessage", () => ({
  AIChatMessage: ({ role, content }: { role: string; content: string }) => (
    <div data-testid={`msg-${role}`}>{content}</div>
  ),
}));

vi.mock("@/lib/auth", () => ({
  getToken: () => "test-token",
}));

import { sendChatMessage } from "@/lib/ai";
import { AIChatSidebar } from "@/components/AIChatSidebar";

describe("AIChatSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows welcome message when open and no messages", () => {
    render(
      <AIChatSidebar
        isOpen={true}
        onClose={mockOnClose}
        onBoardUpdate={mockOnBoardUpdate}
      />,
    );
    expect(screen.getByText(/Ask me to add cards/i)).toBeInTheDocument();
  });

  it("sends message and shows response", async () => {
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      message: "AI response here",
      board: null,
    });

    render(
      <AIChatSidebar
        isOpen={true}
        onClose={mockOnClose}
        onBoardUpdate={mockOnBoardUpdate}
      />,
    );

    const input = screen.getByPlaceholderText("Ask the AI...");
    await userEvent.type(input, "Hello AI");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("AI response here")).toBeInTheDocument();
    });
  });

  it("shows error message on failure", async () => {
    vi.mocked(sendChatMessage).mockRejectedValueOnce(new Error("API error"));

    render(
      <AIChatSidebar
        isOpen={true}
        onClose={mockOnClose}
        onBoardUpdate={mockOnBoardUpdate}
      />,
    );

    const input = screen.getByPlaceholderText("Ask the AI...");
    await userEvent.type(input, "Hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("API error")).toBeInTheDocument();
    });
  });

  it("calls onBoardUpdate when board is returned", async () => {
    const mockBoard = { columns: [], cards: {} };
    vi.mocked(sendChatMessage).mockResolvedValueOnce({
      message: "Updated!",
      board: mockBoard,
    });

    render(
      <AIChatSidebar
        isOpen={true}
        onClose={mockOnClose}
        onBoardUpdate={mockOnBoardUpdate}
      />,
    );

    const input = screen.getByPlaceholderText("Ask the AI...");
    await userEvent.type(input, "Add a card");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(mockOnBoardUpdate).toHaveBeenCalledWith(mockBoard);
    });
  });
});
