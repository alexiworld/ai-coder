"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { AIChatMessage } from "@/components/AIChatMessage";
import { sendChatMessage, type ChatResult } from "@/lib/ai";
import type { BoardResponse } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIChatSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onBoardUpdate: (board: BoardResponse) => void;
};

export const AIChatSidebar = ({
  isOpen,
  onClose,
  onBoardUpdate,
}: AIChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await sendChatMessage(userMessage);
      if (result === null) {
        setError("Session expired. Please log in again.");
        return;
      }

      // Add AI response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.message },
      ]);

      // If board was updated, notify parent
      if (result.board) {
        onBoardUpdate(result.board);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 z-40 flex h-full w-full flex-col border-l border-[var(--stroke)] bg-[var(--surface-strong)] shadow-[var(--shadow)] transition-transform duration-300 sm:w-[400px] lg:relative lg:z-0 lg:w-[400px] ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full lg:translate-x-0 lg:hidden"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--stroke)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--secondary-purple)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-[var(--navy-dark)]">
                AI Assistant
              </h2>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
                Chat with your board
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--stroke)] p-1.5 text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
            aria-label="Close AI chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !error && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-[var(--gray-text)]">
                  Ask me to add cards, move them between columns, or answer
                  questions about your board.
                </p>
                <p className="mt-2 text-xs text-[var(--gray-text)] opacity-60">
                  Try: "Add a card to Backlog" or "What's on my board?"
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <AIChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
          </div>

          {isLoading && (
            <div className="mt-3 flex justify-start">
              <div className="max-w-[85%] rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-70 text-[var(--gray-text)] mb-1">
                  AI
                </p>
                <p className="text-sm text-[var(--gray-text)]">Thinking...</p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--stroke)] px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-[var(--secondary-purple)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
