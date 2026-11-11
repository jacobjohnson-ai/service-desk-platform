// Thin client for Supabase Auth and the REST API.
// The browser only holds the public (publishable) key. What each user can read or change
// is decided by row-level security in Postgres, not by this code.
import type { Session } from "./types";

export const SUPABASE_URL = "https://pwcpznbqkdlprkkydpnk.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_-QgwfTu1udPpjH6ndtqGEA_FUUsMz7G";
export const AGENT_URL = "https://it-helpdesk-agent.jacobjohnson-ai.workers.dev";

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };
export const getToken = () => token;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.prefer) headers.Prefer = opts.prefer;
  const res = await fetch(SUPABASE_URL + path, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.msg || data?.error_description || `Error ${res.status}`);
  return data as T;
}

const STORAGE_KEY = "nw-session";

export async function signIn(email: string, password: string): Promise<Session> {
  const j = await api<{ access_token: string; expires_in: number; user: { id: string } }>(
    "/auth/v1/token?grant_type=password",
    { method: "POST", body: { email, password } },
  );
  const session = { token: j.access_token, userId: j.user.id, expiresAt: Date.now() + j.expires_in * 1000 - 60_000 };
  setToken(session.token);
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* storage blocked */ }
  return session;
}

export function restoreSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as Session | null;
    if (s && s.expiresAt > Date.now()) { setToken(s.token); return s; }
  } catch { /* ignore */ }
  return null;
}

export function signOut() {
  if (token) api("/auth/v1/logout", { method: "POST" }).catch(() => {});
  setToken(null);
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
