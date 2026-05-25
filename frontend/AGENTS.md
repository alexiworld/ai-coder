# Frontend - Kanban Studio

## Overview

This is a NextJS 16.1.6 / React 19.2.3 single-page Kanban board application. It is currently a pure frontend-only MVP with no backend connectivity. The board uses a hardcoded set of initial data with 5 columns (Backlog, Discovery, In Progress, Review, Done) and 8 sample cards.

## Key Technologies

- NextJS 16.1.6 (App Router)
- React 19.2.3
- TypeScript
- Tailwind CSS v4
- @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (drag and drop)
- clsx (class name utility)
- Vitest + @testing-library/react (unit/integration tests)
- Playwright (E2E tests)

## Architecture

### Data Layer (`src/lib/kanban.ts`)
- Types: `Card` (id, title, details), `Column` (id, title, cardIds), `BoardData` (columns, cards)
- `initialData` - hardcoded board state with 5 columns and 8 cards
- `moveCard(columns, activeId, overId)` - pure function for reordering within and across columns
- `createId(prefix)` - generates unique IDs using random + timestamp

### Components
- **KanbanBoard** - Top-level component. Manages board state (useState), sets up DndContext with PointerSensor (6px activation distance), closestCorners collision detection. Provides handlers for rename, add, delete card. Renders header with column tags, 5-column grid, DragOverlay.
- **KanbanColumn** - Droppable area via useDroppable. Wraps cards in SortableContext. Shows rename input, card count, empty state ("Drop a card here"), and NewCardForm at bottom.
- **KanbanCard** - Sortable via useSortable. Shows title, details, delete button.
- **KanbanCardPreview** - Static preview used in DragOverlay during drag.
- **NewCardForm** - Toggleable form with title (required) and details (optional) inputs, Add card/Cancel buttons.

### Pages
- `/` (page.tsx) - Simply renders `<KanbanBoard />`
- Root layout (layout.tsx) - Space Grotesk (display) and Manrope (body) fonts, globals.css

### Color Scheme (CSS Variables in `globals.css`)
- accent-yellow: #ecad0a
- primary-blue: #209dd7
- secondary-purple: #753991
- navy-dark: #032147
- gray-text: #888888
- surface: #f7f8fb
- surface-strong: #ffffff
- stroke: rgba(3, 33, 71, 0.08)
- shadow: 0 18px 40px rgba(3, 33, 71, 0.12)

### Tests

**Unit tests** (`src/lib/kanban.test.ts`):
- Reorders cards in the same column
- Moves cards to another column
- Drops cards to the end of a column

**Component tests** (`src/components/KanbanBoard.test.tsx`):
- Renders 5 columns
- Renames a column
- Adds and removes a card

**E2E tests** (`tests/kanban.spec.ts`):
- Loads the kanban board
- Adds a card to a column
- Moves a card between columns (simulated drag)

### Configuration
- `vitest.config.ts` - jsdom environment, @ path alias, coverage reporter (text + html)
- `playwright.config.ts` - chromium, base URL localhost:3000, webServer auto-start
- `next.config.ts` - default config (no custom settings yet)
- `tsconfig.json` - ES2017 target, bundler module resolution, @/ path alias

## Known limitations
- No backend connectivity (pure frontend demo)
- No authentication
- Single board only
- No AI integration
- No persistence (state resets on refresh)
- No card editing (only add/delete)