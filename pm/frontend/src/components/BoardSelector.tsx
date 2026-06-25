"use client";

import { useState, useRef, useEffect } from "react";
import type { BoardSummary } from "@/lib/api";

type BoardSelectorProps = {
  boards: BoardSummary[];
  currentBoardId: number;
  currentBoardName: string;
  onSelectBoard: (id: number) => void;
  onCreateBoard: (name: string) => void;
  onDeleteBoard: (id: number) => void;
  onRenameBoard: (id: number, name: string) => void;
};

export const BoardSelector = ({
  boards,
  currentBoardId,
  currentBoardName,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  onRenameBoard,
}: BoardSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (creating) newNameRef.current?.focus();
  }, [creating]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateBoard(name);
    setNewName("");
    setCreating(false);
    setOpen(false);
  };

  const handleRenameSubmit = (id: number) => {
    const name = renameValue.trim();
    if (name) onRenameBoard(id, name);
    setRenamingId(null);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--stroke)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--navy-dark)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)]"
        aria-label="Select board"
        data-testid="board-selector-trigger"
      >
        <span className="max-w-[140px] truncate">{currentBoardName}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-[var(--stroke)] bg-white shadow-[0_8px_24px_rgba(3,33,71,0.12)]">
          <div className="max-h-52 overflow-y-auto p-1">
            {boards.map((board) => (
              <div key={board.id} className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-strong)]">
                {renamingId === board.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSubmit(board.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onBlur={() => handleRenameSubmit(board.id)}
                    className="min-w-0 flex-1 rounded border border-[var(--primary-blue)] bg-transparent px-1 text-xs text-[var(--navy-dark)] outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { onSelectBoard(board.id); setOpen(false); }}
                    className="min-w-0 flex-1 truncate text-left text-xs text-[var(--navy-dark)]"
                  >
                    {board.name}
                    {board.id === currentBoardId && (
                      <span className="ml-1 text-[var(--primary-blue)]">✓</span>
                    )}
                  </button>
                )}
                <span className="flex-shrink-0 text-[10px] text-[var(--gray-text)]">
                  {board.card_count}
                </span>
                <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    title="Rename board"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(board.id);
                      setRenameValue(board.name);
                    }}
                    className="rounded p-0.5 text-[var(--gray-text)] hover:text-[var(--navy-dark)]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  {boards.length > 1 && (
                    <button
                      type="button"
                      title="Delete board"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBoard(board.id);
                        setOpen(false);
                      }}
                      className="rounded p-0.5 text-[var(--gray-text)] hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--stroke)] p-1">
            {creating ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  ref={newNameRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setCreating(false); setNewName(""); }
                  }}
                  placeholder="Board name..."
                  className="min-w-0 flex-1 rounded border border-[var(--primary-blue)] bg-transparent px-1 py-0.5 text-xs text-[var(--navy-dark)] outline-none placeholder:text-[var(--gray-text)]"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex-shrink-0 rounded bg-[var(--primary-blue)] px-1.5 py-0.5 text-[10px] font-semibold text-white"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--primary-blue)] hover:bg-blue-50/60"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New board
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
