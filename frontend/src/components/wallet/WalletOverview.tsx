"use client";

import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import type { WalletSummary, WalletTransaction, WalletTransactionReport } from "@/types/wallet";

type WalletAction = "receive" | "send";

function balance(value: string | null | undefined) { return value ?? "—"; }

export function WalletOverview({
  summary, transactions, walletLoading, walletError, transactionsLoading,
  transactionsError, notice, onAction, onDismissNotice, onCopyAddress,
}: {
  summary: WalletSummary | null;
  transactions: WalletTransactionReport | null;
  walletLoading: boolean;
  walletError: string | null;
  transactionsLoading: boolean;
  transactionsError: string | null;
  notice: string | null;
  onAction: (action: WalletAction) => void;
  onDismissNotice: () => void;
  onCopyAddress: () => void;
}) {
  const rlusd = summary?.balances.RLUSD ?? null;
  const xrp = summary?.balances.XRP ?? null;
  const demoBalance = summary?.demo.balance ?? null;
  const statusText = walletLoading ? "Loading Testnet wallet…" : walletError ?? summary?.message;
  const assets = [
    { symbol: "RLUSD", name: "Ripple USD · Testnet", value: balance(rlusd) },
    { symbol: "XRP", name: "XRP · Testnet", value: balance(xrp) },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <section className="wallet-panel wallet-balance-card rounded-[16px] border border-[#dce0dc] bg-[#151719] p-6 text-white sm:p-8" style={{ "--wallet-delay": "300ms" } as CSSProperties} aria-labelledby="wallet-balance-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p id="wallet-balance-heading" className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#b8bec3]">ChatNYC spending balance</p>
            <p className="mt-3 text-[42px] font-semibold tracking-[-0.055em] sm:text-[52px]" aria-live="polite">${walletLoading ? "—" : balance(demoBalance)}</p>
            <p className="mt-1 text-sm font-semibold text-[#d0d4d8]">Demo RLUSD</p>
            <p className="mt-1 text-xs leading-5 text-[#aeb4b9]">Simulated city spending funds. No real monetary value.</p>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#dce6f8]">Demo funds</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" disabled={!summary?.demo} className="wallet-action-button inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-white px-5 text-sm font-semibold text-[#151719] disabled:opacity-50" onClick={() => onAction("send")}>Send <Icon name="arrow-right" size={15} className="wallet-action-arrow" /></button>
        </div>
        {(statusText || notice) && <div role="status" className="wallet-notice mt-5 flex items-start justify-between gap-4 rounded-[10px] border border-white/20 bg-white/8 px-4 py-3 text-xs leading-5 text-[#edf2fb]"><span>{notice ?? statusText}</span>{notice && <button type="button" aria-label="Dismiss wallet notice" onClick={onDismissNotice} className="shrink-0 rounded text-[#cbd1d6] hover:text-white"><Icon name="close" size={14} /></button>}</div>}
      </section>

      <section className="wallet-panel rounded-[16px] border border-[#dfe2df] bg-white p-6" style={{ "--wallet-delay": "370ms" } as CSSProperties} aria-labelledby="wallet-details-heading">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">Network details</p><h2 id="wallet-details-heading" className="mt-1 text-lg font-semibold tracking-[-0.025em]">XRPL Testnet</h2></div><span aria-hidden="true" className={"size-2 rounded-full " + (summary?.available && summary.accountActive ? "bg-[#16865b]" : "bg-[#9aa0a5]")} /></div>
        <dl className="mt-5 divide-y divide-[#eceeeb] border-y border-[#eceeeb] text-sm">
          <div className="py-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b80]">Wallet address</dt><dd className="mt-1.5 break-all font-medium">{summary?.address ?? "Not configured"}</dd></div>
          <div className="py-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b80]">Network</dt><dd className="mt-1.5 font-medium">XRPL Testnet</dd></div>
          <div className="py-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b80]">Real XRP balance</dt><dd className="mt-1.5 font-medium">{balance(xrp)} XRP</dd></div>
          <div className="py-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b80]">Real RLUSD ledger balance</dt><dd className="mt-1.5 font-medium">{balance(rlusd)} RLUSD</dd></div>
          <div className="py-4"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b80]">Trustline</dt><dd className="mt-1.5 font-medium">{summary?.trustlineActive ? "Active" : "Not active"}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!summary?.address} onClick={() => onAction("receive")} className="wallet-secondary-button min-h-10 rounded-[9px] border border-[#d9dcdf] px-4 text-xs font-semibold text-[#0039a6] disabled:opacity-50">Receive</button><button type="button" disabled={!summary?.address} onClick={onCopyAddress} className="wallet-secondary-button min-h-10 rounded-[9px] border border-[#d9dcdf] px-4 text-xs font-semibold text-[#0039a6] disabled:opacity-50" aria-label="Copy XRPL wallet address">Copy address</button></div>
        {summary?.rlusdConfigured && !summary.trustlineActive && <p className="mt-3 text-xs leading-5 text-[#62686d]">RLUSD requires a trustline. Create one on Testnet before receiving RLUSD.</p>}
      </section>

      <section className="wallet-panel rounded-[16px] border border-[#dfe2df] bg-white p-6 sm:p-7" style={{ "--wallet-delay": "440ms" } as CSSProperties} aria-labelledby="wallet-assets-heading">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">Live Testnet data</p><h2 id="wallet-assets-heading" className="mt-1 text-xl font-semibold tracking-[-0.03em]">Assets</h2></div><p className="text-[10px] text-[#747b80]">Balances read from the XRPL ledger</p></div>
        <div className="mt-5 divide-y divide-[#eceeeb] border-y border-[#eceeeb]">
          {assets.map((asset) => <div key={asset.symbol} className="flex items-center justify-between gap-4 py-4">
            <div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#edf2fb] text-[10px] font-bold text-[#0039a6]">{asset.symbol.slice(0, 2)}</span><span><span className="block text-sm font-semibold">{asset.symbol}</span><span className="block text-[10px] text-[#747b80]">{asset.name}</span></span></div>
            <div className="text-right"><span className="block text-sm font-semibold">{asset.value} {asset.value === "—" ? "" : asset.symbol}</span>{asset.symbol === "RLUSD" && rlusd != null && <span className="block text-[10px] text-[#747b80]">Actual Testnet ledger state</span>}</div>
          </div>)}
        </div>
      </section>

      <section className="wallet-panel rounded-[16px] border border-[#dfe2df] bg-white p-6 sm:p-7" style={{ "--wallet-delay": "510ms" } as CSSProperties} aria-labelledby="wallet-activity-heading">
        <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">Demo · Simulated</p><h2 id="wallet-activity-heading" className="mt-1 text-xl font-semibold tracking-[-0.03em]">Recent activity</h2></div><span className="text-[10px] text-[#747b80]">Not submitted to XRPL</span></div>
        {summary?.demo.activity.length ? <ul className="mt-5 divide-y divide-[#eceeeb] border-y border-[#eceeeb]">{summary.demo.activity.map((item) => <li key={item.id} className="flex items-center justify-between gap-4 py-4 text-sm"><span className="min-w-0"><span className="block font-semibold">{item.kind === "split" ? "Split payment" : item.description}</span><span className="block truncate text-[10px] text-[#747b80]">{item.counterparty} · Demo funds · Simulated</span></span><span className="shrink-0 text-right font-semibold">−{item.amount} RLUSD</span></li>)}</ul> : <div className="mt-5 rounded-[12px] border border-dashed border-[#dfe2df] bg-[#fafaf8] p-5 text-center"><p className="text-sm font-semibold">No demo payments yet.</p><p className="mt-1 text-xs text-[#747b80]">Send or split a city expense to see it here.</p></div>}
        <h3 className="mt-7 border-t border-[#eceeeb] pt-6 text-sm font-semibold">Actual XRPL activity</h3>
        {transactionsLoading ? <p role="status" className="mt-5 rounded-lg bg-[#fafaf8] p-5 text-center text-sm text-[#747b80]">Loading Testnet activity…</p>
          : transactionsError ? <p role="status" className="mt-5 rounded-lg bg-[#fafaf8] p-5 text-center text-sm text-[#747b80]">{transactionsError}</p>
          : transactions?.transactions.length ? <ul className="mt-5 divide-y divide-[#eceeeb] border-y border-[#eceeeb]">
            {transactions.transactions.map((transaction: WalletTransaction) => <li key={transaction.id} className="flex items-center justify-between gap-4 py-4 text-sm">
              <span className="min-w-0"><span className="block font-semibold">{transaction.direction === "received" ? "Received" : "Sent"} {transaction.asset}</span><span className="block truncate text-[10px] text-[#747b80]">{transaction.counterparty} · {transaction.timestamp ? new Date(transaction.timestamp).toLocaleDateString() : transaction.status}</span></span>
              <span className="shrink-0 text-right font-semibold">{transaction.direction === "received" ? "+" : "−"}{transaction.amount} {transaction.asset}</span>
            </li>)}
          </ul> : <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-[12px] border border-dashed border-[#dfe2df] bg-[#fafaf8] px-5 text-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#edf2fb] text-[#0039a6]"><Icon name="wallet" size={17} /></span>
            <p className="mt-3 text-sm font-semibold">{transactions?.available ? "No transactions yet." : "Activity unavailable."}</p>
            <p className="mt-1 text-xs leading-5 text-[#747b80]">{transactions?.available ? "Confirmed RLUSD and XRP payments will appear here." : "Balances remain available if the history provider is unavailable."}</p>
          </div>}
      </section>
    </div>
  );
}
