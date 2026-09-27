import { apiUrl } from "@/lib/api";
import { readNextStopAction, type NextStopTrip } from "@/lib/nextstop-handoff";

export type OckTurn = { role: "user" | "assistant"; content: string };
export type OckConversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  preview?: string | null;
  messages?: OckTurn[];
};
export type OckMemory = { id: string; content: string; created_at?: string | null; updated_at?: string | null };

const SESSION_KEY = "chatnyc:ock-guest-session";
let inMemorySessionId = "";

function newGuestSessionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOckSessionId(): string {
  if (typeof window === "undefined") return "server-render";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = inMemorySessionId || newGuestSessionId();
    inMemorySessionId = id;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    if (!inMemorySessionId) inMemorySessionId = newGuestSessionId();
    return inMemorySessionId;
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${apiUrl()}${path}`, { cache: "no-store", ...init });
  if (!response.ok) throw new Error(`Ock request failed (${response.status})`);
  if (response.status === 204) return null;
  return response.json();
}

export async function sendOckMessage(input: {
  message: string;
  history: OckTurn[];
  context?: Record<string, unknown>;
  conversationId?: string | null;
}): Promise<{ reply: string; conversationId: string | null; persistence: "backboard" | "stateless" | null; action: { label: string; href: string; trip: NextStopTrip } | null }> {
  const payload = await request("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      history: input.history,
      context: input.context,
      session_id: getOckSessionId(),
      conversation_id: input.conversationId || undefined,
    }),
  });
  if (!payload || typeof payload !== "object") throw new Error("Ock returned an invalid response");
  const row = payload as Record<string, unknown>;
  if (typeof row.reply !== "string" || !row.reply.trim()) throw new Error("Ock returned an empty response");
  return {
    reply: row.reply,
    conversationId: typeof row.conversation_id === "string" ? row.conversation_id : null,
    persistence: row.persistence === "backboard" || row.persistence === "stateless" ? row.persistence : null,
    action: readNextStopAction(row),
  };
}

export async function listOckConversations(): Promise<{ available: boolean; conversations: OckConversation[]; message?: string }> {
  const payload = await request(`/api/assistant/conversations?${new URLSearchParams({ session_id: getOckSessionId() })}`);
  if (!payload || typeof payload !== "object") throw new Error("Ock history returned an invalid response");
  const row = payload as Record<string, unknown>;
  return {
    available: row.available === true,
    conversations: Array.isArray(row.conversations) ? row.conversations as OckConversation[] : [],
    message: typeof row.message === "string" ? row.message : undefined,
  };
}

export async function getOckConversation(id: string): Promise<OckConversation> {
  const payload = await request(`/api/assistant/conversations/${encodeURIComponent(id)}?${new URLSearchParams({ session_id: getOckSessionId() })}`);
  if (!payload || typeof payload !== "object") throw new Error("Ock conversation returned an invalid response");
  return payload as OckConversation;
}

export async function createOckConversation(): Promise<string> {
  const payload = await request("/api/assistant/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: getOckSessionId() }),
  });
  if (!payload || typeof payload !== "object" || typeof (payload as Record<string, unknown>).id !== "string") {
    throw new Error("Ock could not create a conversation");
  }
  return (payload as { id: string }).id;
}

export async function listOckMemories(): Promise<{ available: boolean; memories: OckMemory[]; message?: string }> {
  const payload = await request(`/api/assistant/memories?${new URLSearchParams({ session_id: getOckSessionId() })}`);
  if (!payload || typeof payload !== "object") throw new Error("Ock memory returned an invalid response");
  const row = payload as Record<string, unknown>;
  return {
    available: row.available === true,
    memories: Array.isArray(row.memories) ? row.memories as OckMemory[] : [],
    message: typeof row.message === "string" ? row.message : undefined,
  };
}

export async function forgetOckMemory(id: string): Promise<void> {
  await request(`/api/assistant/memories/${encodeURIComponent(id)}?${new URLSearchParams({ session_id: getOckSessionId() })}`, { method: "DELETE" });
}
