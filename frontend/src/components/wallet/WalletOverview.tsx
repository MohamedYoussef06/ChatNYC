"use client";

import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import type { WalletAccount, WalletAsset, WalletTransaction } from "@/types/wallet";

type WalletAction = "receive" | "send";

export function WalletOverview({
  account,
  assets,
  transactions,
  notice,
  onAction,
  onDismissNotice,
}: {
  account: WalletAccount;
  assets: WalletAsset[];
  transactions: WalletTransaction[];
  notice: string | null;
  onAction: (action: WalletAction) => void;
  onDismissNotice: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <section className="wallet-panel wallet-balance-card rounded-[16px] border border-[#dce0dc] bg-[#151719] p-6 text-white sm:p-8" style={{ "--wallet-delay": "300ms" } as CSSProperties} aria-labelledby="wallet-balance-heading">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="wallet-balance-heading" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b8bec3]">Available balance</p>
            <p className="mt-3 text-[42px] font-semibold tracking-[-0.055em] sm:text-[52px]">${account.availableBalance}</p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#dce6f8]">{account.isDemo ? "Demo wallet" : "Wallet"}</span>
        </div>
        <p className="mt-1 max-w-md text-xs leading-5 text-[#aeb4b9]">Template balance. No funds or blockchain account are connected.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" className="wallet-action-button inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-white px-5 text-sm font-semibold text-[#151719]" onClick={() => onAction("receive")}>
            Receive <span aria-hidden="true" className="text-[#0039a6]">↓</span>
          </button>
          <button type="button" className="wallet-action-button inline-flex min-h-11 items-center gap-2 rounded-[9px] border border-white/30 px-5 text-sm font-semibold text-white" onClick={() => onAction("send")}>
            Send <Icon name="arrow-right" size={15} className="wallet-action-arrow" />
          </button>
        </div>
        {notice && (
          <div role="status" className="wallet-notice mt-5 flex items-start justify-between gap-4 rounded-[10px] border border-white/20 bg-white/8 px-4 py-3 text-xs leading-5 text-[#edf2fb]">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss wallet notice" onClick={onDismissNotice} className="shrink-0 rounded text-[#cbd1d6] hover:text-white"><Icon name="close" size={14} /></button>
          </div>
        )}
      </section>

      <section className="wallet-panel rounded-[16px] border border-[#dfe2df] bg-white p-6" style={{ "--wallet-delay": "370ms" } as CSSProperties} aria-labelledby="wallet-details-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="wallet-details-heading" className="text-lg font-semibold tracking-[-0.025em]">Wallet details</h2>
          <span className={`size-2 rounded-full ${account.connectionStatus === "connected" ? "bg-[#16865b]" : "bg-[#9aa0a5]"}`} aria-hidden="true" />
        </div>
        <dl className="mt-5 divide-y divide-[#eceeeb] border-y border-[#eceeeb] text-sm">
          <div className="py-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b80]">Wallet address</dt><dd className="mt-1.5 font-medium">{account.address ?? "Not connected"}</dd></div>
          <div className="py-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b80]">Network</dt><dd className="mt-1.5 font-medium">{account.network ?? "Not connected"}</dd></div>
        </dl>
        <button type="button" disabled={!account.address} className="mt-4 min-h-10 rounded-[9px] border border-[#d9dcdf] px-4 text-xs font-semibold text-[#6b7176] disabled:opacity-50" aria-label="Copy wallet address">
          Copy address
        </button>
      </section>

      <section className="wallet-panel rounded-[16px] border border-[#dfe2df] bg-white p-6 sm:p-7" style={{ "--wallet-delay": "440ms" } as CSSProperties} aria-labelledby="wallet-assets-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">Template data</p><h2 id="wallet-assets-heading" className="mt-1 text-xl font-semibold tracking-[-0.03em]">Assets</h2></div>
          <p className="text-[10px] text-[#747b80]">Balances are demonstrations</p>
        </div>
        <div className="mt-5 divide-y divide-[#eceeeb] border-y border-[#eceeeb]">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#edf2fb] text-[10px] font-bold text-[#0039a6]">{asset.symbol.slice(0, 2)}</span><span><span className="block text-sm font-semibold">{asset.symbol}</span><span className="block text-[10px] text-[#747b80]">{asset.name}{asset.isTemplate ? " · Demo" : ""}</span></span></div>
              <div className="text-right"><span className="block text-sm font-semibold">{asset.balance}</span>{asset.fiatValue && <span className="block text-[10px] text-[#747b80]">{asset.fiatValue}</span>}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="wallet-panel rounded-[16px] border border-[#dfe2df] bg-white p-6 sm:p-7" style={{ "--wallet-delay": "510ms" } as CSSProperties} aria-labelledby="wallet-activity-heading">
        <h2 id="wallet-activity-heading" className="text-xl font-semibold tracking-[-0.03em]">Recent activity</h2>
        {transactions.length === 0 ? (
          <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-[12px] border border-dashed border-[#dfe2df] bg-[#fafaf8] px-5 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#edf2fb] text-[#0039a6]"><Icon name="wallet" size={17} /></span>
            <p className="mt-3 text-sm font-semibold">No transactions yet.</p>
            <p className="mt-1 text-xs leading-5 text-[#747b80]">Payments and transfers will appear here.</p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-[#eceeeb] border-y border-[#eceeeb]">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="flex items-center justify-between gap-4 py-4 text-sm">
                <span className="min-w-0"><span className="block font-semibold capitalize">{transaction.type}</span><span className="block truncate text-[10px] text-[#747b80]">{transaction.counterparty ?? transaction.status} · {new Date(transaction.timestamp).toLocaleDateString()}</span></span>
                <span className="shrink-0 text-right font-semibold">{transaction.amount} {transaction.asset}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
