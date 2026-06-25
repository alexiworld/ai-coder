import { getToken } from "@/lib/auth";
import type { BoardResponse } from "@/lib/api";

const API_BASE = "";

export type ChatResult = {
  message: string;
  board: BoardResponse | null;
};

export async function sendChatMessage(message: string): Promise<ChatResult | null> {
  const token = getToken();
  if (!token) return null;

  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (res.status === 401) return null;

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Request failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    message: data.message,
    board: data.board,
  };
}
