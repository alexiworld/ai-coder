import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm — sign in mode", () => {
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

describe("LoginForm — sign up mode", () => {
  it("shows mode toggle when onRegister is provided", () => {
    render(
      <LoginForm onLogin={vi.fn()} onRegister={vi.fn()} error={null} isLoading={false} />,
    );
    // Toggle has both "Sign in" tab and "Sign up" tab; submit button also says "Sign in"
    expect(screen.getAllByRole("button", { name: /^sign in$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /^sign up$/i })).toBeInTheDocument();
  });

  it("switches to sign up mode and shows confirm password field", async () => {
    render(
      <LoginForm onLogin={vi.fn()} onRegister={vi.fn()} error={null} isLoading={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("calls onRegister when form is submitted in sign up mode", async () => {
    const onRegister = vi.fn();
    render(
      <LoginForm onLogin={vi.fn()} onRegister={onRegister} error={null} isLoading={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    await userEvent.type(screen.getByLabelText("Username"), "newuser");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(onRegister).toHaveBeenCalledWith("newuser", "secret123");
  });

  it("shows local error when passwords do not match", async () => {
    render(
      <LoginForm onLogin={vi.fn()} onRegister={vi.fn()} error={null} isLoading={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    await userEvent.type(screen.getByLabelText("Username"), "newuser");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "different");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  });

  it("shows local error when password is too short", async () => {
    render(
      <LoginForm onLogin={vi.fn()} onRegister={vi.fn()} error={null} isLoading={false} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    await userEvent.type(screen.getByLabelText("Username"), "newuser");
    await userEvent.type(screen.getByLabelText("Password"), "abc");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "abc");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("at least 6 characters");
  });

  it("shows creating account when loading in sign up mode", async () => {
    render(
      <LoginForm onLogin={vi.fn()} onRegister={vi.fn()} error={null} isLoading={true} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled();
  });
});
