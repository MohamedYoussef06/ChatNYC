export type WalletAssetCode = "XRP" | "RLUSD";

export interface WalletSummary {
  network: "testnet";
  available: boolean;
  configured: boolean;
  address: string | null;
  balances: Record<WalletAssetCode, string | null>;
  rlusdConfigured: boolean;
  trustlineActive: boolean;
  accountActive: boolean | null;
  message: string | null;
  demo: DemoWalletState;
}

export interface DemoActivity {
  id: string;
  kind: "send" | "split";
  mode: "demo";
  simulated: true;
  asset: "RLUSD";
  amount: string;
  direction: "sent";
  counterparty: string;
  description: string;
  timestamp: string;
  transactionHash: null;
  ledgerIndex: null;
}

export interface DemoWalletState {
  balance: string;
  currency: "RLUSD";
  label: "Demo RLUSD";
  activity: DemoActivity[];
}

export interface DemoPaymentResult {
  status: "simulated";
  mode: "demo";
  simulated: true;
  asset: "RLUSD";
  amount: string;
  balance: string;
  activity: DemoActivity;
  transactionHash: null;
  ledgerIndex: null;
}

export interface DemoSplitResult extends DemoPaymentResult {
  total: string;
  participantCount: number;
  each: string;
}

export interface WalletTransaction {
  id: string;
  hash: string;
  type: "payment";
  direction: "received" | "sent";
  asset: WalletAssetCode;
  amount: string;
  counterparty: string;
  status: "confirmed" | "pending";
  timestamp: string | null;
  ledgerIndex: number | null;
  mode: "xrpl";
  simulated: false;
}

export interface WalletFxEstimate {
  available: boolean;
  asset: "RLUSD";
  amount: string;
  baseCurrency: "USD";
  values: Partial<Record<"USD" | "EUR" | "GBP" | "CAD" | "MXN" | "PEN" | "JPY", string>>;
  rateDate: string | null;
  source: string;
  message: string | null;
}

export interface WalletSwapQuote {
  available: boolean;
  from: WalletAssetCode;
  to: WalletAssetCode;
  inputAmount: string;
  estimatedOutput: string | null;
  source: string | null;
  network: "testnet";
  ledgerIndex: number | null;
  reason: string | null;
}

export interface WalletSendResult {
  status: "confirmed" | "pending";
  asset: WalletAssetCode;
  amount: string;
  destination: string;
  transactionHash: string | null;
  ledgerIndex: number | null;
}

export type WalletTransactionReport = {
  available: boolean;
  transactions: WalletTransaction[];
  message: string | null;
};
