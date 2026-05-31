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
  const [board, setBoard] = useState<BoardData>(EMPTY_BOARD);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Optimistically update the board
    setBoard((prev) => ({
      ...prev,
      columns: moveCardUtil(
        prev.columns,
        active.id as string,
        over.id as string,
      ),
    }));

    // Then persist to backend
    // Find which column the card ended up in
    const overColId =
      over.data?.current?.sortable?.containerId || (over.id as string);
    // Check if over is a column or a card
    const isColumn = board.columns.some((c) => c.id === over.id);
    const targetColId = isColumn ? (over.id as string) : overColId;

    try {
      await apiMoveCard(active.id as string, targetColId);
    } catch {
      // Revert on failure by reloading from server
      loadBoard();
    }
  };

  const handleRenameColumn = async (columnId: string, title: string) => {
    // Optimistic update
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column,
      ),
    }));

    try {
      await apiRenameColumn(columnId, title);
    } catch {
      loadBoard();
    }
  };

  const handleAddCard = async (
    columnId: string,
    title: string,
    details: string,
  ) => {
    try {
      const result = await apiAddCard(
        columnId,
        title,
        details || "No details yet.",
      );
      if (result === null) {
        router.replace("/login");
        return;
      }

      // Add card to local state for immediate feedback
      const newCard: Card = {
        id: result.card_id,
        title,
        details: details || "No details yet.",
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
    // Optimistic update
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
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-10 px-6 pb-16 pt-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Single Board Kanban
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                Kanban Studio
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                Keep momentum visible. Rename columns, drag cards between
                stages, and capture quick notes without getting buried in
                settings.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
                  {getUsername()}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-[var(--stroke)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
                >
                  Logout
                </button>
              </div>
              <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                  Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                  One board. Five columns. Zero clutter.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <section className="grid gap-6 lg:grid-cols-5">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
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
              <div className="w-[260px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
