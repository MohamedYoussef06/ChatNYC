import { api } from '@/lib/api';
import type { ChatTurn } from '@/types';

export async function sendOckMessage(message: string, history: ChatTurn[], context?: Record<string, unknown>): Promise<string> {
  const result = await api<{ reply: string }>('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ message, history: history.slice(-10), ...(context ? { context } : {}) }) });
  if (!result || typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('Ock returned an empty response.');
  return result.reply;
}
