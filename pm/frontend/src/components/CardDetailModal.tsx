"use client";

import { useState, useEffect } from "react";
import type { Card, Label } from "@/lib/kanban";
import { PRIORITY_CONFIG } from "@/lib/kanban";
import {
  listComments,
  addComment,
  deleteComment,
  listLabels,
  addLabel,
  deleteLabel,
} from "@/lib/api";
import type { CommentData } from "@/lib/api";

type CardDetailModalProps = {
  card: Card;
  boardId?: number;
  onClose: () => void;
  onSave: (
    cardId: string,
    fields: { title?: string; details?: string; priority?: string; due_date?: string },
  ) => Promise<void>;
};

const LABEL_COLORS = [
  "#209dd7",
  "#753991",
  "#ecad0a",
  "#10b981",
  "#ef4444",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
];

export const CardDetailModal = ({ card, boardId, onClose, onSave }: CardDetailModalProps) => {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [priority, setPriority] = useState<string>(card.priority);
  const [dueDate, setDueDate] = useState(card.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [labels, setLabels] = useState<Label[]>(card.labels ?? []);
  const [newLabelText, setNewLabelText] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);
  const [addingLabel, setAddingLabel] = useState(false);

  useEffect(() => {
    if (boardId === undefined) return;
    listComments(boardId, card.id).then((data) => {
      if (data) setComments(data);
    });
    listLabels(boardId, card.id).then((data) => {
      if (data) setLabels(data);
    });
  }, [boardId, card.id]);

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

  const handleAddComment = async () => {
    if (!newComment.trim() || boardId === undefined) return;
    setSubmittingComment(true);
    try {
      const result = await addComment(boardId, card.id, newComment.trim());
      if (result) {
        setComments((prev) => [...prev, result]);
        setNewComment("");
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (boardId === undefined) return;
    await deleteComment(boardId, card.id, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleAddLabel = async () => {
    if (!newLabelText.trim() || boardId === undefined) return;
    setAddingLabel(true);
    try {
      const result = await addLabel(boardId, card.id, newLabelText.trim(), newLabelColor);
      if (result) {
        setLabels((prev) => [...prev, result]);
        setNewLabelText("");
      }
    } finally {
      setAddingLabel(false);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (boardId === undefined) return;
    await deleteLabel(boardId, card.id, labelId);
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-8"
      onClick={handleBackdrop}
      onKeyDown={handleKeyDown}
      data-testid="card-detail-modal"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl mx-4">
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
              rows={3}
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

          {/* Labels */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
              Labels
            </label>
            {labels.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="labels-list">
                {labels.map((lb) => (
                  <span
                    key={lb.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: lb.color }}
                    data-testid={`label-${lb.id}`}
                  >
                    {lb.label}
                    <button
                      type="button"
                      onClick={() => handleDeleteLabel(lb.id)}
                      className="ml-0.5 opacity-70 hover:opacity-100"
                      aria-label={`Remove label ${lb.label}`}
                      data-testid={`delete-label-${lb.id}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1.5 flex gap-1.5">
              <input
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                placeholder="Add label..."
                className="flex-1 rounded-xl border border-[var(--stroke)] px-3 py-1.5 text-xs text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
                data-testid="label-input"
                onKeyDown={(e) => e.key === "Enter" && handleAddLabel()}
              />
              <div className="flex gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewLabelColor(c)}
                    className="h-5 w-5 rounded-full transition"
                    style={{
                      backgroundColor: c,
                      outline: newLabelColor === c ? `2px solid ${c}` : "none",
                      outlineOffset: "1px",
                    }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddLabel}
                disabled={addingLabel || !newLabelText.trim()}
                className="rounded-xl bg-[var(--primary-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                data-testid="add-label-btn"
              >
                Add
              </button>
            </div>
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

        {/* Comments */}
        <div className="mt-6 border-t border-[var(--stroke)] pt-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)]">
            Comments ({comments.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto" data-testid="comments-list">
            {comments.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-2 rounded-xl bg-gray-50 px-3 py-2"
                data-testid={`comment-${c.id}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-[var(--navy-dark)]">
                    {c.username}
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--gray-text)]">{c.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteComment(c.id)}
                  className="flex-shrink-0 text-[var(--gray-text)] transition hover:text-red-500"
                  aria-label="Delete comment"
                  data-testid={`delete-comment-${c.id}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-xl border border-[var(--stroke)] px-3 py-2 text-xs text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] focus:ring-2 focus:ring-[var(--primary-blue)]/20"
              data-testid="comment-input"
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={submittingComment || !newComment.trim()}
              className="rounded-xl bg-[var(--primary-blue)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              data-testid="add-comment-btn"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
