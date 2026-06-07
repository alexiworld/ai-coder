import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  login,
  logout,
  isAuthenticated,
  getUsername,
  getToken,
  getMe,
} from "@/lib/auth";

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  // Re-initialize auth state
  vi.resetModules();
});

describe("auth lib", () => {
  it("login returns success with valid credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc123", username: "user" }),
    });

    const result = await login("user", "password");
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(isAuthenticated()).toBe(true);
    expect(getUsername()).toBe("user");
    expect(getToken()).toBe("abc123");
  });

  it("login returns error with invalid credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Invalid username or password" }),
    });

    const result = await login("user", "wrong");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid username or password");
  });

  it("login returns error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await login("user", "password");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error. Is the server running?");
  });

  it("logout sends request then clears state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc123", username: "user" }),
    });
    await login("user", "password");
    expect(isAuthenticated()).toBe(true);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await logout();
    expect(isAuthenticated()).toBe(false);
    expect(getToken()).toBeNull();
    expect(getUsername()).toBeNull();
  });

  it("logout handles network error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    // Should not throw
    await expect(logout()).resolves.toBeUndefined();
  });

  it("getMe returns true when token is valid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc123", username: "user" }),
    });
    await login("user", "password");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: "user" }),
    });

    const result = await getMe();
    expect(result).toBe(true);
  });

  it("getMe returns false when token is invalid", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc123", username: "user" }),
    });
    await login("user", "password");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid token" }),
    });

    const result = await getMe();
    expect(result).toBe(false);
    expect(isAuthenticated()).toBe(false);
  });

  it("getMe returns false when not authenticated", async () => {
    const result = await getMe();
    expect(result).toBe(false);
  });

  it("getMe returns false on network error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc123", username: "user" }),
    });
    await login("user", "password");

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await getMe();
    expect(result).toBe(false);
  });

  it("isAuthenticated returns false after logout", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc123", username: "user" }),
    });
    await login("user", "password");
    expect(isAuthenticated()).toBe(true);

    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await logout();
    expect(isAuthenticated()).toBe(false);
  });
});