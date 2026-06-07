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
    // Token expired - will redirect to login via AuthGuard
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
};

export type ColumnData = {
  id: string;
  title: string;
  cardIds: string[];
};

export type BoardResponse = {
  columns: ColumnData[];
  cards: Record<string, CardData>;
};

export async function fetchBoard(): Promise<BoardResponse | null> {
  return authFetch("/api/board");
}

export async function renameColumn(
  columnId: string,
  title: string,
): Promise<unknown> {
  return authFetch(`/api/board/columns/${columnId}/rename`, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

export async function addCard(
  columnId: string,
  title: string,
  details: string,
): Promise<{ card_id: string } | null> {
  return authFetch("/api/board/cards", {
    method: "POST",
    body: JSON.stringify({ column_id: columnId, title, details }),
  });
}

export async function moveCard(
  cardId: string,
  targetColumnId: string,
  position?: number,
): Promise<unknown> {
  return authFetch(`/api/board/cards/${cardId}/move`, {
    method: "PUT",
    body: JSON.stringify({
      target_column_id: targetColumnId,
      position,
    }),
  });
}

export async function deleteCard(cardId: string): Promise<unknown> {
  return authFetch(`/api/board/cards/${cardId}`, {
    method: "DELETE",
  });
}

export async function editCard(
  cardId: string,
  title?: string,
  details?: string,
): Promise<unknown> {
  return authFetch(`/api/board/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify({ title, details }),
  });
}