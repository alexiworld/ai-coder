"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { getUsername } from "@/lib/auth";
import { changePassword } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const username = getUsername();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="pointer-events-none fixed left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative flex min-h-screen items-center justify-center bg-[var(--surface)] px-4 py-12">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to board
          </button>

          <div className="rounded-2xl border border-[var(--stroke)] bg-white/90 px-8 py-8 shadow-[0_4px_16px_rgba(3,33,71,0.08)] backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-[var(--navy-dark)]">
                  Profile
                </h1>
                <p className="text-sm text-[var(--gray-text)]">{username}</p>
              </div>
            </div>

            <div className="mb-6 border-t border-[var(--stroke)]" />

            <h2 className="mb-4 font-display text-base font-semibold text-[var(--navy-dark)]">
              Change Password
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-[var(--stroke)] px-3 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
                  placeholder="Enter current password"
                  data-testid="current-password-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1.5 w-full rounded-xl border border-[var(--stroke)] px-3 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
                  placeholder="At least 6 characters"
                  data-testid="new-password-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-xl border border-[var(--stroke)] px-3 py-2.5 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
                  placeholder="Repeat new password"
                  data-testid="confirm-password-input"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" data-testid="profile-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" data-testid="profile-success">
                  Password changed successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-[var(--primary-blue)] py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
                data-testid="change-password-btn"
              >
                {saving ? "Saving..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
