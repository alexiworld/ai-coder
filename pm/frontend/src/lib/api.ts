import { getToken } from "@/lib/auth";

const API_BASE = "";

async function authFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

export type CardData = {
  id: string;
  title: string;
  details: string;
  priority: "low" | "medium" | "high" | "critical";
  due_date: string | null;
};

export type ColumnData = {
  id: string;
  title: string;
  cardIds: string[];
  color: string | null;
};

export type BoardResponse = {
  id: number;
  name: string;
  columns: ColumnData[];
  cards: Record<string, CardData>;
};

export type BoardSummary = {
  id: number;
  name: string;
  created_at: string;
  column_count: number;
  card_count: number;
};

// --- Board management ---

export async function fetchBoard(boardId?: number): Promise<BoardResponse | null> {
  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}`);
  }
  return authFetch("/api/board");
}

export async function listBoards(): Promise<BoardSummary[] | null> {
  return authFetch("/api/boards");
}

export async function createBoard(name: string): Promise<BoardResponse | null> {
  return authFetch("/api/boards", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function renameBoard(boardId: number, name: string): Promise<unknown> {
  return authFetch(`/api/boards/${boardId}/name`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteBoard(boardId: number): Promise<unknown> {
  return authFetch(`/api/boards/${boardId}`, { method: "DELETE" });
}

// --- Column management ---

export async function renameColumn(
  columnId: string,
  title: string,
  boardId?: number,
): Promise<unknown> {
  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}/columns/${columnId}/rename`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }
  return authFetch(`/api/board/columns/${columnId}/rename`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

export async function addColumn(
  title: string,
  color?: string,
  boardId?: number,
): Promise<{ column_id: string } | null> {
  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}/columns`, {
      method: "POST",
      body: JSON.stringify({ title, color }),
    });
  }
  return authFetch("/api/board/columns", {
    method: "POST",
    body: JSON.stringify({ title, color }),
  });
}

export async function deleteColumn(
  columnId: string,
  boardId?: number,
): Promise<unknown> {
  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}/columns/${columnId}`, {
      method: "DELETE",
    });
  }
  return authFetch(`/api/board/columns/${columnId}`, { method: "DELETE" });
}

// --- Card management ---

export async function addCard(
  columnId: string,
  title: string,
  details: string,
  priority: string = "medium",
  dueDate?: string,
  boardId?: number,
): Promise<{ card_id: string } | null> {
  const body: Record<string, unknown> = {
    column_id: columnId,
    title,
    details,
    priority,
  };
  if (dueDate) body.due_date = dueDate;

  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}/cards`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
  return authFetch("/api/board/cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function moveCard(
  cardId: string,
  targetColumnId: string,
  position?: number,
  boardId?: number,
): Promise<unknown> {
  const body: Record<string, unknown> = { target_column_id: targetColumnId };
  if (position !== undefined) body["position"] = position;

  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}/cards/${cardId}/move`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }
  return authFetch(`/api/board/cards/${cardId}/move`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCard(cardId: string, boardId?: number): Promise<unknown> {
  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}/cards/${cardId}`, { method: "DELETE" });
  }
  return authFetch(`/api/board/cards/${cardId}`, { method: "DELETE" });
}

export async function editCard(
  cardId: string,
  fields: { title?: string; details?: string; priority?: string; due_date?: string },
  boardId?: number,
): Promise<unknown> {
  if (boardId !== undefined) {
    return authFetch(`/api/boards/${boardId}/cards/${cardId}`, {
      method: "PUT",
      body: JSON.stringify(fields),
    });
  }
  return authFetch(`/api/board/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(fields),
  });
}

// --- Auth ---

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<unknown> {
  return authFetch("/api/auth/me/password", {
    method: "PUT",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
