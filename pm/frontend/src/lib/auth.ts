const API_BASE = "";

type AuthState = {
  token: string | null;
  username: string | null;
};

let authState: AuthState = {
  token: typeof window !== "undefined" ? localStorage.getItem("kanban_token") : null,
  username: typeof window !== "undefined" ? localStorage.getItem("kanban_username") : null,
};

export type LoginResult = {
  success: boolean;
  error?: string;
};

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.detail || "Login failed" };
    }

    const data = await res.json();
    localStorage.setItem("kanban_token", data.token);
    localStorage.setItem("kanban_username", data.username);
    authState = { token: data.token, username: data.username };
    return { success: true };
  } catch {
    return { success: false, error: "Network error. Is the server running?" };
  }
}

export async function register(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.detail || "Registration failed" };
    }

    const data = await res.json();
    localStorage.setItem("kanban_token", data.token);
    localStorage.setItem("kanban_username", data.username);
    authState = { token: data.token, username: data.username };
    return { success: true };
  } catch {
    return { success: false, error: "Network error. Is the server running?" };
  }
}

export async function logout(): Promise<void> {
  const token = authState.token;
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  localStorage.removeItem("kanban_token");
  localStorage.removeItem("kanban_username");
  authState = { token: null, username: null };
}

export async function getMe(): Promise<boolean> {
  const token = authState.token;
  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      logout();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  return authState.token !== null;
}

export function getToken(): string | null {
  return authState.token;
}

export function getUsername(): string | null {
  return authState.username;
}