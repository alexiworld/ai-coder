import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  it("renders form fields and sign in button", () => {
    render(<LoginForm onLogin={vi.fn()} error={null} isLoading={false} />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("calls onLogin with credentials on submit", async () => {
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} error={null} isLoading={false} />);

    await userEvent.type(screen.getByLabelText("Username"), "user");
    await userEvent.type(screen.getByLabelText("Password"), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalledWith("user", "password");
  });

  it("shows error message", () => {
    render(
      <LoginForm
        onLogin={vi.fn()}
        error="Invalid credentials"
        isLoading={false}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
  });

  it("disables button when loading", () => {
    render(<LoginForm onLogin={vi.fn()} error={null} isLoading={true} />);
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });

  it("does not submit with empty fields", async () => {
    const onLogin = vi.fn();
    render(<LoginForm onLogin={onLogin} error={null} isLoading={false} />);

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(onLogin).not.toHaveBeenCalled();
  });
});
