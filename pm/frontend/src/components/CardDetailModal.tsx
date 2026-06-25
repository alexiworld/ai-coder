"use client";

import { useState } from "react";
import type { Card } from "@/lib/kanban";
import { PRIORITY_CONFIG } from "@/lib/kanban";

type CardDetailModalProps = {
  card: Card;
  onClose: () => void;
  onSave: (
    cardId: string,
    fields: { title?: string; details?: string; priority?: string; due_date?: string },
  ) => Promise<void>;
};

export const CardDetailModal = ({ card, onClose, onSave }: CardDetailModalProps) => {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [priority, setPriority] = useState<string>(card.priority);
  const [dueDate, setDueDate] = useState(card.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(card.id, {
        title: title.trim(),
        details: details.trim(),
        priority,
        due_date: dueDate,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleBackdrop}
      onKeyDown={handleKeyDown}
      data-testid="card-detail-modal"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-[var(--navy-dark)]">
            Edit Card
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--gray-text)] transition hover:bg-gray-100 hover:text-[var(--navy-dark)]"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
              data-testid="modal-title-input"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
              data-testid="modal-details-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
              Priority
            </label>
            <div className="mt-1.5 flex gap-2">
              {(["low", "medium", "high", "critical"] as const).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide transition"
                    style={{
                      backgroundColor: active ? cfg.color : "transparent",
                      color: active ? "#fff" : cfg.color,
                      border: `1.5px solid ${cfg.color}`,
                    }}
                    data-testid={`priority-btn-${p}`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--stroke)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
              data-testid="modal-due-date-input"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600" data-testid="modal-error">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDueDate("")}
            className="text-xs text-[var(--gray-text)] underline transition hover:text-[var(--navy-dark)]"
            data-testid="clear-due-date"
          >
            Clear due date
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-[var(--primary-blue)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
              data-testid="save-card-btn"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
