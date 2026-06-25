import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

const COLUMN_COLORS = [
  "#ecad0a",
  "#209dd7",
  "#753991",
  "#10b981",
  "#f97316",
];

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  colorIndex: number;
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onDeleteColumn: (columnId: string) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  colorIndex,
  onRename,
  onAddCard,
  onDeleteCard,
  onDeleteColumn,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const accentColor = column.color || COLUMN_COLORS[colorIndex % COLUMN_COLORS.length];

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[480px] flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--surface-strong)] p-3 transition",
        isOver && "ring-2 ring-[var(--primary-blue)] bg-blue-50/30",
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <input
          value={column.title}
          onChange={(event) => onRename(column.id, event.target.value)}
          className="min-w-0 flex-1 bg-transparent font-display text-sm font-semibold text-[var(--navy-dark)] outline-none"
          aria-label="Column title"
        />
        <div className="flex flex-shrink-0 items-center gap-1">
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: accentColor }}
          >
            {cards.length}
          </span>
          <button
            type="button"
            onClick={() => onDeleteColumn(column.id)}
            className="rounded p-0.5 text-[var(--gray-text)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
            aria-label={`Delete column ${column.title}`}
            title="Delete column"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--stroke)] px-3 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Drop here
          </div>
        )}
      </div>
      <NewCardForm
        onAdd={(title, details) => onAddCard(column.id, title, details)}
      />
    </section>
  );
};
