export type WalletConnectionStatus = "disconnected" | "connected";

export interface WalletAccount {
  connectionStatus: WalletConnectionStatus;
  address: string | null;
  network: string | null;
  availableBalance: string;
  currency: "USD";
  isDemo: boolean;
}

export interface WalletAsset {
  id: string;
  name: string;
  symbol: string;
  balance: string;
  fiatValue: string | null;
  isTemplate: boolean;
}

export type WalletTransactionType = "receive" | "send" | "split";
export type WalletTransactionStatus = "pending" | "completed" | "failed";

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  counterparty: string | null;
  amount: string;
  asset: string;
  status: WalletTransactionStatus;
  timestamp: string;
}
