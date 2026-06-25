import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card } from "@/lib/kanban";
import { PRIORITY_CONFIG } from "@/lib/kanban";

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  onEdit?: (card: Card) => void;
};

function formatDueDate(due: string): { label: string; overdue: boolean } {
  const date = new Date(due + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = date < today;
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, overdue };
}

export const KanbanCard = ({ card, onDelete, onEdit }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityCfg = PRIORITY_CONFIG[card.priority] ?? PRIORITY_CONFIG.medium;
  const showPriority = card.priority !== "medium";
  const dueDateInfo = card.due_date ? formatDueDate(card.due_date) : null;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group rounded-2xl border border-transparent bg-white px-3 py-3 shadow-[0_4px_16px_rgba(3,33,71,0.07)]",
        "transition-all duration-150 hover:shadow-[0_8px_24px_rgba(3,33,71,0.12)]",
        isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]",
      )}
      {...attributes}
      data-testid={`card-${card.id}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...listeners}
          className="mt-0.5 flex-shrink-0 cursor-grab touch-none text-[var(--gray-text)] opacity-0 transition-opacity group-hover:opacity-40 hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag card"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <circle cx="9" cy="5" r="2" />
            <circle cx="15" cy="5" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="15" cy="12" r="2" />
            <circle cx="9" cy="19" r="2" />
            <circle cx="15" cy="19" r="2" />
          </svg>
        </div>

        {/* Clickable card body */}
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => onEdit?.(card)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onEdit?.(card)}
          aria-label={`Edit ${card.title}`}
        >
          <h4 className="font-display text-sm font-semibold leading-snug text-[var(--navy-dark)]">
            {card.title}
          </h4>
          {card.details && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--gray-text)]">
              {card.details}
            </p>
          )}
          {(showPriority || dueDateInfo) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {showPriority && (
                <span
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: priorityCfg.color }}
                  data-testid={`priority-${card.priority}`}
                >
                  {priorityCfg.label}
                </span>
              )}
              {dueDateInfo && (
                <span
                  className={clsx(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    dueDateInfo.overdue
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-[var(--gray-text)]",
                  )}
                  data-testid="due-date"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {dueDateInfo.label}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(card.id)}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 rounded-md p-1 text-[var(--gray-text)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
          aria-label={`Delete ${card.title}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </article>
  );
};
