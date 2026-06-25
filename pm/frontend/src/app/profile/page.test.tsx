import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfilePage from "@/app/profile/page";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/AuthGuard", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/auth", () => ({
  getUsername: () => "testuser",
}));

const mockChangePassword = vi.fn();

vi.mock("@/lib/api", () => ({
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    mockChangePassword.mockReset();
    mockChangePassword.mockResolvedValue({ status: "ok" });
  });

  it("renders username", () => {
    render(<ProfilePage />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("renders change password form", () => {
    render(<ProfilePage />);
    expect(screen.getByTestId("current-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("new-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();
  });

  it("shows error when new passwords do not match", async () => {
    render(<ProfilePage />);
    await userEvent.type(screen.getByTestId("current-password-input"), "oldpass");
    await userEvent.type(screen.getByTestId("new-password-input"), "newpass1");
    await userEvent.type(screen.getByTestId("confirm-password-input"), "newpass2");
    await userEvent.click(screen.getByTestId("change-password-btn"));
    expect(screen.getByTestId("profile-error")).toHaveTextContent("do not match");
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it("shows error when new password is too short", async () => {
    render(<ProfilePage />);
    await userEvent.type(screen.getByTestId("current-password-input"), "oldpass");
    await userEvent.type(screen.getByTestId("new-password-input"), "abc");
    await userEvent.type(screen.getByTestId("confirm-password-input"), "abc");
    await userEvent.click(screen.getByTestId("change-password-btn"));
    expect(screen.getByTestId("profile-error")).toHaveTextContent("6 characters");
  });

  it("calls changePassword and shows success on valid submit", async () => {
    render(<ProfilePage />);
    await userEvent.type(screen.getByTestId("current-password-input"), "oldpass");
    await userEvent.type(screen.getByTestId("new-password-input"), "newpass123");
    await userEvent.type(screen.getByTestId("confirm-password-input"), "newpass123");
    await userEvent.click(screen.getByTestId("change-password-btn"));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith("oldpass", "newpass123");
      expect(screen.getByTestId("profile-success")).toBeInTheDocument();
    });
  });

  it("shows API error when changePassword fails", async () => {
    mockChangePassword.mockRejectedValue(new Error("Wrong password"));
    render(<ProfilePage />);
    await userEvent.type(screen.getByTestId("current-password-input"), "wrongpass");
    await userEvent.type(screen.getByTestId("new-password-input"), "newpass123");
    await userEvent.type(screen.getByTestId("confirm-password-input"), "newpass123");
    await userEvent.click(screen.getByTestId("change-password-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("profile-error")).toHaveTextContent("Wrong password");
    });
  });

  it("renders back to board button", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("button", { name: /back to board/i })).toBeInTheDocument();
  });
});
