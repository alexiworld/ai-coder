"use client";

import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
};

export const LoginForm = ({ onLogin, error, isLoading }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;
    onLogin(username.trim(), password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] p-6">
      <div className="w-full max-w-sm rounded-[32px] border border-[var(--stroke)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-[var(--navy-dark)]">
            Kanban Studio
          </h1>
          <p className="mt-2 text-sm text-[var(--gray-text)]">
            Sign in to your workspace
          </p>
        </div>

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
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-[var(--secondary-purple)] px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};
