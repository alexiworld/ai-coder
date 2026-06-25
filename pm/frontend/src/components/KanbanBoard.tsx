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
import { BoardSelector } from "@/components/BoardSelector";
import {
  moveCard as moveCardUtil,
  type BoardData,
  type Card,
} from "@/lib/kanban";
import { logout, getUsername } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  fetchBoard,
  listBoards,
  createBoard,
  renameBoard,
  deleteBoard,
  renameColumn as apiRenameColumn,
  addColumn as apiAddColumn,
  deleteColumn as apiDeleteColumn,
  addCard as apiAddCard,
  moveCard as apiMoveCard,
  deleteCard as apiDeleteCard,
  type BoardResponse,
  type BoardSummary,
} from "@/lib/api";
import { AIChatSidebar } from "@/components/AIChatSidebar";

const EMPTY_BOARD: BoardData = {
  id: 0,
  name: "My Board",
  columns: [],
  cards: {},
};

const convertApiResponse = (data: BoardResponse): BoardData => ({
  id: data.id,
  name: data.name,
  columns: data.columns.map((col) => ({
    id: col.id,
    title: col.title,
    cardIds: col.cardIds,
    color: col.color,
  })),
  cards: Object.fromEntries(
    Object.entries(data.cards).map(([id, card]) => [
      id,
      {
        id: card.id,
        title: card.title,
        details: card.details,
        priority: card.priority,
        due_date: card.due_date,
      },
    ]),
  ),
});

export const KanbanBoard = () => {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const renameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [board, setBoard] = useState<BoardData>(EMPTY_BOARD);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | undefined>(undefined);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);

  const loadBoards = useCallback(async () => {
    try {
      const data = await listBoards();
      if (data === null) {
        routerRef.current.replace("/login");
        return;
      }
      setBoards(data);
      return data;
    } catch {
      // Non-fatal: board list is supplementary to the main board
    }
  }, []);

  const loadBoard = useCallback(async (boardId?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchBoard(boardId);
      if (data === null) {
        routerRef.current.replace("/login");
        return;
      }
      setBoard(convertApiResponse(data));
      setActiveBoardId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load board");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadBoards();
      await loadBoard();
    };
    init();
  }, [loadBoard, loadBoards]);

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

  const handleSelectBoard = async (id: number) => {
    await loadBoard(id);
  };

  const handleCreateBoard = async (name: string) => {
    const newBoard = await createBoard(name);
    if (newBoard === null) {
      routerRef.current.replace("/login");
      return;
    }
    await loadBoards();
    await loadBoard(newBoard.id);
  };

  const handleRenameBoard = async (id: number, name: string) => {
    await renameBoard(id, name);
    await loadBoards();
    if (id === activeBoardId) {
      setBoard((prev) => ({ ...prev, name }));
    }
  };

  const handleDeleteBoard = async (id: number) => {
    if (!window.confirm("Delete this board and all its cards?")) return;
    try {
      await deleteBoard(id);
      await loadBoards();
      if (id === activeBoardId) {
        await loadBoard();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Cannot delete board");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over || active.id === over.id) return;

    setBoard((prev) => ({
      ...prev,
      columns: moveCardUtil(prev.columns, active.id as string, over.id as string),
    }));

    const overColId =
      over.data?.current?.sortable?.containerId || (over.id as string);
    const isColumn = board.columns.some((c) => c.id === over.id);
    const targetColId = isColumn ? (over.id as string) : overColId;

    try {
      await apiMoveCard(active.id as string, targetColId, undefined, activeBoardId);
    } catch {
      loadBoard(activeBoardId);
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
        await apiRenameColumn(columnId, title, activeBoardId);
      } catch {
        loadBoard(activeBoardId);
      }
    }, 400);
  };

  const handleAddColumn = async () => {
    const title = window.prompt("New column name:");
    if (!title?.trim()) return;
    try {
      const result = await apiAddColumn(title.trim(), undefined, activeBoardId);
      if (result === null) {
        routerRef.current.replace("/login");
        return;
      }
      await loadBoard(activeBoardId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add column");
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const col = board.columns.find((c) => c.id === columnId);
    const cardCount = col?.cardIds.length ?? 0;
    const msg = cardCount > 0
      ? `Delete column "${col?.title}" and its ${cardCount} card(s)?`
      : `Delete column "${col?.title}"?`;
    if (!window.confirm(msg)) return;
    try {
      await apiDeleteColumn(columnId, activeBoardId);
      await loadBoard(activeBoardId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete column");
    }
  };

  const handleAddCard = async (columnId: string, title: string, details: string) => {
    try {
      const result = await apiAddCard(columnId, title, details, "medium", undefined, activeBoardId);
      if (result === null) {
        routerRef.current.replace("/login");
        return;
      }

      const newCard: Card = {
        id: result.card_id,
        title,
        details,
        priority: "medium",
        due_date: null,
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
    } catch {
      loadBoard(activeBoardId);
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
      await apiDeleteCard(cardId, activeBoardId);
    } catch {
      loadBoard(activeBoardId);
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
            onClick={() => loadBoard(activeBoardId)}
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
              {boards.length > 0 && (
                <BoardSelector
                  boards={boards}
                  currentBoardId={activeBoardId ?? board.id}
                  currentBoardName={board.name}
                  onSelectBoard={handleSelectBoard}
                  onCreateBoard={handleCreateBoard}
                  onDeleteBoard={handleDeleteBoard}
                  onRenameBoard={handleRenameBoard}
                />
              )}
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
                <section className="grid gap-3" style={{ gridTemplateColumns: `repeat(${board.columns.length + 1}, minmax(200px, 1fr))` }}>
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
                      onDeleteColumn={handleDeleteColumn}
                    />
                  ))}
                  {/* Add column button */}
                  <div className="flex min-h-[120px] items-start justify-center pt-3">
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="flex items-center gap-1.5 rounded-full border border-dashed border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add column
                    </button>
                  </div>
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

            <AIChatSidebar
              isOpen={aiSidebarOpen}
              onClose={() => setAiSidebarOpen(false)}
              onBoardUpdate={handleBoardUpdate}
              boardId={activeBoardId}
            />
          </div>
        </div>
      </main>

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
