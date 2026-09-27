import { api } from '@/lib/api';
import type { DemoPaymentResult, DemoSplitResult, WalletSummary, WalletTransactions } from '@/types';

export async function getWallet(): Promise<WalletSummary> { return api<WalletSummary>('/api/wallet'); }
export async function getTransactions(): Promise<WalletTransactions> { return api('/api/wallet/transactions'); }
export async function sendPayment(input: { asset: 'RLUSD' | 'XRP'; amount: string; destination: string }): Promise<{ status: string; asset: string; amount: string; transaction_hash?: string | null }> { return api('/api/wallet/send', { method: 'POST', body: JSON.stringify(input) }); }
export async function sendDemoPayment(input: { amount: string; recipient: string; note?: string }): Promise<DemoPaymentResult> { return api('/api/wallet/demo/send', { method: 'POST', body: JSON.stringify({ ...input, idempotency_key: `mobile-send-${Date.now()}` }) }); }
export async function payDemoSplit(input: { total: string; participant_count: number; expense: string }): Promise<DemoSplitResult> { return api('/api/wallet/demo/split', { method: 'POST', body: JSON.stringify({ ...input, idempotency_key: `mobile-split-${Date.now()}` }) }); }
