import { api } from '@/lib/api';
import type { ChatTurn } from '@/types';

export type OckConversation = { id: string; title: string; created_at: string; updated_at: string; preview?: string | null; messages?: ChatTurn[] };
export type OckMemory = { id: string; content: string; created_at?: string | null; updated_at?: string | null };

const guestSessionId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function ockSessionId(): string { return guestSessionId; }

export async function sendOckMessage(message: string, history: ChatTurn[], context?: Record<string, unknown>, conversationId?: string | null): Promise<{ reply: string; conversationId: string | null; persistence: 'backboard' | 'stateless' | null }> {
  const result = await api<{ reply: string; conversation_id?: string; persistence?: 'backboard' | 'stateless' }>('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ message, history: history.slice(-10), session_id: guestSessionId, ...(conversationId ? { conversation_id: conversationId } : {}), ...(context ? { context } : {}) }) });
  if (!result || typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('Ock returned an empty response.');
  return { reply: result.reply, conversationId: typeof result.conversation_id === 'string' ? result.conversation_id : null, persistence: result.persistence ?? null };
}

export async function createOckConversation(): Promise<string> {
  const result = await api<{ id: string }>('/api/assistant/conversations', { method: 'POST', body: JSON.stringify({ session_id: guestSessionId }) });
  if (!result?.id) throw new Error('Ock could not create a conversation.');
  return result.id;
}

export async function listOckConversations(): Promise<{ available: boolean; conversations: OckConversation[]; message?: string }> {
  return api(`/api/assistant/conversations?session_id=${encodeURIComponent(guestSessionId)}`);
}

export async function getOckConversation(id: string): Promise<OckConversation> {
  return api(`/api/assistant/conversations/${encodeURIComponent(id)}?session_id=${encodeURIComponent(guestSessionId)}`);
}

export async function listOckMemories(): Promise<{ available: boolean; memories: OckMemory[]; message?: string }> {
  return api(`/api/assistant/memories?session_id=${encodeURIComponent(guestSessionId)}`);
}

export async function forgetOckMemory(id: string): Promise<void> {
  await api(`/api/assistant/memories/${encodeURIComponent(id)}?session_id=${encodeURIComponent(guestSessionId)}`, { method: 'DELETE' });
}
