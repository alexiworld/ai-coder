import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthGuard } from "@/components/AuthGuard";

const mockReplace = vi.fn();

let mockIsAuthenticated = true;
let mockGetMeResult = true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/auth", () => ({
  isAuthenticated: () => mockIsAuthenticated,
  getMe: () => Promise.resolve(mockGetMeResult),
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockIsAuthenticated = true;
    mockGetMeResult = true;
  });

  it("shows loading then renders children when authenticated", async () => {
    render(
      <AuthGuard>
        <div data-testid="child">Protected content</div>
      </AuthGuard>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    const child = await screen.findByTestId("child");
    expect(child).toHaveTextContent("Protected content");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to login when not authenticated", () => {
    mockIsAuthenticated = false;

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when token is invalid", async () => {
    mockIsAuthenticated = true;
    mockGetMeResult = false;

    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });
});
