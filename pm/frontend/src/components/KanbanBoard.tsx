"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import {
  moveCard as moveCardUtil,
  type BoardData,
  type Card,
  type Column,
} from "@/lib/kanban";
import { logout, getUsername } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  fetchBoard,
  renameColumn as apiRenameColumn,
  addCard as apiAddCard,
  moveCard as apiMoveCard,
  deleteCard as apiDeleteCard,
  type BoardResponse,
} from "@/lib/api";
import { AIChatSidebar } from "@/components/AIChatSidebar";

const EMPTY_BOARD: BoardData = {
  columns: [],
  cards: {},
};

const convertApiResponse = (data: BoardResponse): BoardData => ({
  columns: data.columns.map((col) => ({
    id: col.id,
    title: col.title,
    cardIds: col.cardIds,
  })),
  cards: Object.fromEntries(
    Object.entries(data.cards).map(([id, card]) => [
      id,
      { id: card.id, title: card.title, details: card.details },
    ]),
  ),
});

export const KanbanBoard = () => {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const renameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [board, setBoard] = useState<BoardData>(EMPTY_BOARD);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);

  const loadBoard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchBoard();
      if (data === null) {
        routerRef.current.replace("/login");
        return;
      }
      setBoard(convertApiResponse(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load board");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    return () => {
      if (renameTimerRef.current) clearTimeout(renameTimerRef.current);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const cardsById = useMemo(() => board.cards, [board.cards]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) {
      return;
    }

    setBoard((prev) => ({
      ...prev,
      columns: moveCardUtil(
        prev.columns,
        active.id as string,
        over.id as string,
      ),
    }));

    const overColId =
      over.data?.current?.sortable?.containerId || (over.id as string);
    const isColumn = board.columns.some((c) => c.id === over.id);
    const targetColId = isColumn ? (over.id as string) : overColId;

    try {
      await apiMoveCard(active.id as string, targetColId);
    } catch {
      loadBoard();
    }
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column,
      ),
    }));

    if (renameTimerRef.current) clearTimeout(renameTimerRef.current);
    renameTimerRef.current = setTimeout(async () => {
      try {
        await apiRenameColumn(columnId, title);
      } catch {
        loadBoard();
      }
    }, 400);
  };

  const handleAddCard = async (
    columnId: string,
    title: string,
    details: string,
  ) => {
    try {
      const result = await apiAddCard(columnId, title, details);
      if (result === null) {
        routerRef.current.replace("/login");
        return;
      }

      const newCard: Card = {
        id: result.card_id,
        title,
        details,
      };
      setBoard((prev) => ({
        ...prev,
        cards: { ...prev.cards, [result.card_id]: newCard },
        columns: prev.columns.map((column) =>
          column.id === columnId
            ? { ...column, cardIds: [...column.cardIds, result.card_id] }
            : column,
        ),
      }));
    } catch (e) {
      loadBoard();
    }
  };

  const handleDeleteCard = async (columnId: string, cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(
        Object.entries(prev.cards).filter(([id]) => id !== cardId),
      ),
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, cardIds: column.cardIds.filter((id) => id !== cardId) }
          : column,
      ),
    }));

    try {
      await apiDeleteCard(cardId);
    } catch {
      loadBoard();
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleBoardUpdate = (newBoard: BoardResponse) => {
    setBoard(convertApiResponse(newBoard));
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <p className="text-sm text-[var(--gray-text)]">Loading board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={loadBoard}
            className="mt-4 rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex max-w-[1600px] flex-col gap-4 px-4 pb-8 pt-4">
        <div className="flex flex-col gap-4">
          <header className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--stroke)] bg-white/90 px-5 py-3 shadow-[0_4px_16px_rgba(3,33,71,0.08)] backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[var(--accent-yellow)]" />
                <div className="h-3 w-3 rounded-full bg-[var(--primary-blue)]" />
                <div className="h-3 w-3 rounded-full bg-[var(--secondary-purple)]" />
              </div>
              <h1 className="font-display text-base font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <span className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)] sm:block">
                — Single Board
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] sm:block">
                {getUsername()}
              </span>
              <button
                type="button"
                onClick={() => setAiSidebarOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-[var(--accent-yellow)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
                aria-label="Open AI Chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>AI Chat</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-[var(--stroke)] p-1.5 text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
                aria-label="Logout"
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </header>

          <div className="flex gap-4">
            <div className="flex-1 min-w-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <section className="grid gap-3 lg:grid-cols-5">
                  {board.columns.map((column, index) => (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      colorIndex={index}
                      cards={column.cardIds
                        .map((cardId) => board.cards[cardId])
                        .filter(Boolean)}
                      onRename={handleRenameColumn}
                      onAddCard={handleAddCard}
                      onDeleteCard={handleDeleteCard}
                    />
                  ))}
                </section>
                <DragOverlay>
                  {activeCard ? (
                    <div className="w-[220px]">
                      <KanbanCardPreview card={activeCard} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>

            {/* AI Chat Sidebar */}
            <AIChatSidebar
              isOpen={aiSidebarOpen}
              onClose={() => setAiSidebarOpen(false)}
              onBoardUpdate={handleBoardUpdate}
            />
          </div>
        </div>
      </main>

      {/* Floating button to open AI chat when sidebar is closed */}
      {!aiSidebarOpen && (
        <button
          type="button"
          onClick={() => setAiSidebarOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--secondary-purple)] text-white shadow-lg transition hover:brightness-110"
          aria-label="Open AI Chat"
        >
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
    </div>
  );
};
