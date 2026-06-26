"use client";

import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister?: (username: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
};

export const LoginForm = ({ onLogin, onRegister, error, isLoading }: LoginFormProps) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const isSignUp = mode === "signup" && !!onRegister;

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setLocalError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;

    if (isSignUp) {
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setLocalError("Password must be at least 6 characters");
        return;
      }
      setLocalError(null);
      onRegister!(username.trim(), password);
    } else {
      setLocalError(null);
      onLogin(username.trim(), password);
    }
  };

  const displayError = localError || error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] p-6">
      <div className="w-full max-w-sm rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-[var(--navy-dark)]">
            Kanban Studio
          </h1>
          <p className="mt-2 text-sm text-[var(--gray-text)]">
            {isSignUp ? "Create your account" : "Sign in to your workspace"}
          </p>
        </div>

        {onRegister && (
          <div className="mb-6 flex rounded-full border border-[var(--stroke)] bg-white p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                !isSignUp
                  ? "bg-[var(--navy-dark)] text-white"
                  : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                isSignUp
                  ? "bg-[var(--navy-dark)] text-white"
                  : "text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
              }`}
            >
              Sign up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
              placeholder={isSignUp ? "At least 6 characters" : "Enter your password"}
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
                placeholder="Re-enter your password"
                required
              />
            </div>
          )}

          {displayError && (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
              role="alert"
            >
              {displayError}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-[var(--secondary-purple)] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {isLoading
              ? isSignUp ? "Creating account..." : "Signing in..."
              : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};
