import type {
  DemoActivity,
  DemoPaymentResult,
  DemoSplitResult,
  WalletAssetCode,
  WalletFxEstimate,
  WalletSendResult,
  WalletSummary,
  WalletSwapQuote,
  WalletTransaction,
  WalletTransactionReport,
} from "@/types/wallet";

type UnknownRecord = Record<string, unknown>;
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeBalance(value: unknown): string | null {
  return typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value) ? value : null;
}

function parseDemoActivity(value: unknown): DemoActivity | null {
  const row = record(value);
  if (!row || typeof row.id !== "string" || !["send", "split"].includes(String(row.kind)) ||
      row.mode !== "demo" || row.simulated !== true || row.asset !== "RLUSD" ||
      safeBalance(row.amount) === null || row.direction !== "sent" ||
      typeof row.counterparty !== "string" || typeof row.description !== "string" ||
      typeof row.timestamp !== "string" || row.transaction_hash !== null || row.ledger_index !== null) return null;
  return {
    id: row.id, kind: row.kind as DemoActivity["kind"], mode: "demo", simulated: true,
    asset: "RLUSD", amount: row.amount as string, direction: "sent",
    counterparty: row.counterparty, description: row.description, timestamp: row.timestamp,
    transactionHash: null, ledgerIndex: null,
  };
}

export function parseWalletSummary(value: unknown): WalletSummary | null {
  const row = record(value);
  const balances = record(row?.balances);
  const demo = record(row?.demo);
  if (!row || row.network !== "testnet" || typeof row.available !== "boolean" ||
      typeof row.configured !== "boolean" || typeof row.rlusd_configured !== "boolean" ||
      typeof row.trustline_active !== "boolean" || !balances || !demo ||
      safeBalance(demo.balance) === null || demo.currency !== "RLUSD" || demo.label !== "Demo RLUSD" ||
      !Array.isArray(demo.activity)) return null;
  const demoActivity = demo.activity.map(parseDemoActivity);
  if (demoActivity.some((item) => item === null)) return null;
  return {
    network: "testnet",
    available: row.available,
    configured: row.configured,
    address: nullableText(row.address),
    balances: { XRP: safeBalance(balances.XRP), RLUSD: safeBalance(balances.RLUSD) },
    rlusdConfigured: row.rlusd_configured,
    trustlineActive: row.trustline_active,
    accountActive: typeof row.account_active === "boolean" ? row.account_active : null,
    message: nullableText(row.message),
    demo: {
      balance: demo.balance as string,
      currency: "RLUSD",
      label: "Demo RLUSD",
      activity: demoActivity as DemoActivity[],
    },
  };
}

export function parseWalletTransaction(value: unknown): WalletTransaction | null {
  const row = record(value);
  if (!row || typeof row.id !== "string" || typeof row.hash !== "string" ||
      row.type !== "payment" || !["received", "sent"].includes(String(row.direction)) ||
      !["RLUSD", "XRP"].includes(String(row.asset)) || safeBalance(row.amount) === null ||
      typeof row.counterparty !== "string" || !["confirmed", "pending"].includes(String(row.status))) return null;
  return {
    id: row.id,
    hash: row.hash,
    type: "payment",
    direction: row.direction as WalletTransaction["direction"],
    asset: row.asset as WalletAssetCode,
    amount: row.amount as string,
    counterparty: row.counterparty,
    status: row.status as WalletTransaction["status"],
    timestamp: nullableText(row.timestamp),
    ledgerIndex: typeof row.ledger_index === "number" ? row.ledger_index : null,
    mode: "xrpl",
    simulated: false,
  };
}

export function parseWalletTransactions(value: unknown): WalletTransactionReport | null {
  const row = record(value);
  if (!row || typeof row.available !== "boolean" || !Array.isArray(row.transactions)) return null;
  return {
    available: row.available,
    transactions: row.transactions.flatMap((item) => {
      const transaction = parseWalletTransaction(item);
      return transaction ? [transaction] : [];
    }),
    message: nullableText(row.message),
  };
}

export function parseWalletFxEstimate(value: unknown): WalletFxEstimate | null {
  const row = record(value);
  const rawValues = record(row?.values);
  if (!row || typeof row.available !== "boolean" || row.asset !== "RLUSD" ||
      typeof row.amount !== "string" || row.base_currency !== "USD" || !rawValues) return null;
  const values: WalletFxEstimate["values"] = {};
  for (const currency of ["USD", "EUR", "GBP", "CAD", "MXN", "PEN", "JPY"] as const) {
    const amount = safeBalance(rawValues[currency]);
    if (amount !== null) values[currency] = amount;
  }
  return {
    available: row.available,
    asset: "RLUSD",
    amount: row.amount,
    baseCurrency: "USD",
    values,
    rateDate: nullableText(row.rate_date),
    source: typeof row.source === "string" ? row.source : "ExchangeRate-API",
    message: nullableText(row.message),
  };
}

export function parseWalletSwapQuote(value: unknown): WalletSwapQuote | null {
  const row = record(value);
  if (!row || typeof row.available !== "boolean" || !["RLUSD", "XRP"].includes(String(row.from)) ||
      !["RLUSD", "XRP"].includes(String(row.to)) || typeof row.input_amount !== "string" ||
      row.network !== "testnet") return null;
  return {
    available: row.available,
    from: row.from as WalletAssetCode,
    to: row.to as WalletAssetCode,
    inputAmount: row.input_amount,
    estimatedOutput: safeBalance(row.estimated_output),
    source: nullableText(row.source),
    network: "testnet",
    ledgerIndex: typeof row.ledger_index === "number" ? row.ledger_index : null,
    reason: nullableText(row.reason),
  };
}

async function readResponse<T>(response: Response, parse: (value: unknown) => T | null): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = record(payload)?.detail;
    throw new Error(typeof detail === "string" ? detail : "Wallet service is temporarily unavailable.");
  }
  const normalized = parse(payload);
  if (!normalized) throw new Error("Wallet service returned an invalid response.");
  return normalized;
}

export async function getWalletSummary(signal?: AbortSignal): Promise<WalletSummary> {
  return readResponse(await fetch(API + "/api/wallet", { cache: "no-store", signal }), parseWalletSummary);
}

export async function getWalletTransactions(signal?: AbortSignal): Promise<WalletTransactionReport> {
  return readResponse(await fetch(API + "/api/wallet/transactions", { cache: "no-store", signal }), parseWalletTransactions);
}

export async function sendWalletPayment(input: {
  asset: WalletAssetCode;
  amount: string;
  destination: string;
  destinationTag?: number;
}): Promise<WalletSendResult> {
  const response = await fetch(API + "/api/wallet/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset: input.asset,
      amount: input.amount,
      destination: input.destination,
      ...(input.destinationTag == null ? {} : { destination_tag: input.destinationTag }),
    }),
  });
  return readResponse(response, (value) => {
    const row = record(value);
    if (!row || !["confirmed", "pending"].includes(String(row.status)) ||
        !["RLUSD", "XRP"].includes(String(row.asset)) || typeof row.amount !== "string" ||
        typeof row.destination !== "string") return null;
    return {
      status: row.status as WalletSendResult["status"],
      asset: row.asset as WalletAssetCode,
      amount: row.amount,
      destination: row.destination,
      transactionHash: nullableText(row.transaction_hash),
      ledgerIndex: typeof row.ledger_index === "number" ? row.ledger_index : null,
    };
  });
}

function parseDemoPayment(value: unknown): DemoPaymentResult | null {
  const row = record(value);
  const activity = parseDemoActivity(row?.activity);
  if (!row || row.status !== "simulated" || row.mode !== "demo" || row.simulated !== true ||
      row.asset !== "RLUSD" || safeBalance(row.amount) === null || safeBalance(row.balance) === null ||
      !activity || row.transaction_hash !== null || row.ledger_index !== null) return null;
  return {
    status: "simulated", mode: "demo", simulated: true, asset: "RLUSD",
    amount: row.amount as string, balance: row.balance as string, activity,
    transactionHash: null, ledgerIndex: null,
  };
}

export async function sendDemoPayment(input: {
  amount: string;
  recipient: string;
  note?: string;
  idempotencyKey: string;
}): Promise<DemoPaymentResult> {
  const response = await fetch(API + "/api/wallet/demo/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amount, recipient: input.recipient, note: input.note || null,
      idempotency_key: input.idempotencyKey,
    }),
  });
  return readResponse(response, parseDemoPayment);
}

export async function payDemoSplit(input: {
  total: string;
  participantCount: number;
  expense: string;
  idempotencyKey: string;
}): Promise<DemoSplitResult> {
  const response = await fetch(API + "/api/wallet/demo/split", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      total: input.total, participant_count: input.participantCount,
      expense: input.expense, idempotency_key: input.idempotencyKey,
    }),
  });
  return readResponse(response, (value) => {
    const base = parseDemoPayment(value);
    const row = record(value);
    if (!base || !row || safeBalance(row.total) === null || safeBalance(row.each) === null ||
        typeof row.participant_count !== "number") return null;
    return { ...base, total: row.total as string, each: row.each as string, participantCount: row.participant_count };
  });
}

export async function getWalletFxEstimate(amount: string, signal?: AbortSignal): Promise<WalletFxEstimate> {
  return readResponse(
    await fetch(API + "/api/wallet/fx?" + new URLSearchParams({ amount }), { cache: "no-store", signal }),
    parseWalletFxEstimate,
  );
}

export async function getWalletSwapQuote(
  from: WalletAssetCode,
  to: WalletAssetCode,
  amount: string,
  signal?: AbortSignal,
): Promise<WalletSwapQuote> {
  const response = await fetch(API + "/api/wallet/swap/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ from, to, amount }),
  });
  return readResponse(response, parseWalletSwapQuote);
}
