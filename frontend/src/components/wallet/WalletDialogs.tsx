"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { getWalletFxEstimate, getWalletSwapQuote, sendDemoPayment } from "@/lib/wallet";
import type { DemoPaymentResult, WalletFxEstimate, WalletSummary, WalletSwapQuote } from "@/types/wallet";

type WalletDialog = "receive" | "send" | "convert";

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="wallet-dialog-heading" className="wallet-panel wallet-dialog w-full max-w-lg rounded-t-2xl border border-[#dfe2df] bg-[#fffefa] p-5 shadow-2xl sm:rounded-2xl sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#e7e9e5] pb-4">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0039a6]">ChatNYC Wallet · Demo funds</p><h2 id="wallet-dialog-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{title}</h2></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#6b7176] hover:bg-[#f0f1ed]" aria-label="Close wallet dialog"><Icon name="close" size={18} /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function WalletDialogs({
  dialog, summary, initialAmount, onClose, onRefresh,
}: {
  dialog: WalletDialog | null;
  summary: WalletSummary | null;
  initialAmount?: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  if (!dialog) return null;
  if (dialog === "receive") return <ReceiveDialog address={summary?.address ?? null} onClose={onClose} />;
  if (dialog === "convert") return <ConvertDialog amount={summary?.balances.RLUSD ?? ""} onClose={onClose} />;
  return <SendDialog summary={summary} initialAmount={initialAmount} onClose={onClose} onRefresh={onRefresh} />;
}

function ReceiveDialog({ address, onClose }: { address: string | null; onClose: () => void }) {
  const [status, setStatus] = useState("");
  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setStatus("Testnet address copied.");
    } catch {
      setStatus("Copy is unavailable in this browser. Select the address to copy it.");
    }
  }
  return <DialogFrame title="Receive" onClose={onClose}>
    <p className="text-sm leading-6 text-[#62686d]">Receive demo assets on the XRP Ledger Testnet. Only send Testnet funds to this address.</p>
    <label className="mt-5 block"><span className="wallet-label">XRPL Testnet address</span><input className="wallet-input break-all" value={address ?? "Wallet not configured"} readOnly /></label>
    <button type="button" disabled={!address} onClick={() => void copyAddress()} className="wallet-primary-button mt-4 min-h-11 rounded-[9px] bg-[#0039a6] px-5 text-sm font-semibold text-white disabled:opacity-50">Copy address</button>
    <p role="status" className="mt-3 min-h-5 text-xs text-[#62686d]">{status}</p>
    <p className="mt-3 rounded-lg bg-[#f5f6f3] p-3 text-xs leading-5 text-[#62686d]">RLUSD can only be received after the wallet has the correct RLUSD Testnet trustline.</p>
  </DialogFrame>;
}

function SendDialog({ summary, initialAmount, onClose, onRefresh }: {
  summary: WalletSummary | null;
  initialAmount?: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [amount, setAmount] = useState(initialAmount ?? "");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DemoPaymentResult | null>(null);
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  async function confirmSend() {
    setSubmitting(true);
    setError("");
    try {
      const sent = await sendDemoPayment({
        amount,
        recipient: recipient.trim(),
        note: note.trim() || undefined,
        idempotencyKey,
      });
      setResult(sent);
      onRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The payment could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  function continueToReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!recipient.trim() || !amount || Number(amount) <= 0) {
      setError("Enter a recipient and an amount greater than zero.");
      return;
    }
    setIdempotencyKey(crypto.randomUUID());
    setReview(true);
  }

  return <DialogFrame title={result ? "Payment result" : review ? "Review payment" : "Send"} onClose={onClose}>
    {result ? (
      <div role="status" className="rounded-xl border border-[#dfe2df] bg-[#f7f8f5] p-5">
        <p className="text-lg font-semibold">Demo payment complete</p>
        <p className="mt-2 text-sm text-[#4f565b]">Sent {result.amount} Demo RLUSD to {result.activity.counterparty}.</p>
        <p className="mt-2 text-sm font-semibold text-[#102859]">New demo balance: {result.balance} RLUSD</p>
        <p className="mt-3 rounded-lg bg-[#edf2fb] p-3 text-xs leading-5 text-[#4d5f7a]">Simulated with Demo funds. This payment was not submitted to XRPL and has no transaction hash or ledger confirmation.</p>
        <button type="button" onClick={onClose} className="wallet-primary-button mt-5 min-h-11 rounded-[9px] bg-[#0039a6] px-5 text-sm font-semibold text-white">Done</button>
      </div>
    ) : review ? (
      <>
        <dl className="divide-y divide-[#e7e9e5] border-y border-[#e7e9e5]">
          <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-[#62686d]">Send</dt><dd className="font-semibold">{amount} Demo RLUSD</dd></div>
          <div className="py-3 text-sm"><dt className="text-[#62686d]">To</dt><dd className="mt-1 font-semibold">{recipient}</dd></div>
          <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-[#62686d]">Payment type</dt><dd className="font-semibold">Simulated demo</dd></div>
          <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-[#62686d]">Balance after</dt><dd className="font-semibold">{Math.max(0, Number(summary?.demo.balance ?? 0) - Number(amount || 0)).toFixed(2)} RLUSD</dd></div>
        </dl>
        <p className="mt-4 rounded-lg bg-[#edf2fb] p-3 text-xs leading-5 text-[#4d5f7a]">This changes only your ChatNYC Demo RLUSD balance. It will not create or claim an XRPL transaction.</p>
        {error && <p role="alert" className="mt-3 text-sm text-[#b3261e]">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" disabled={submitting} onClick={() => { setReview(false); setError(""); }} className="wallet-secondary-button min-h-11 rounded-[9px] border border-[#d3d8d4] px-4 text-sm font-semibold disabled:opacity-50">Back</button>
          <button type="button" disabled={submitting} onClick={() => void confirmSend()} className="wallet-primary-button min-h-11 flex-1 rounded-[9px] bg-[#0039a6] px-5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Sending…" : "Send Demo RLUSD"}</button>
        </div>
      </>
    ) : (
      <form onSubmit={continueToReview}>
        <p className="mb-5 text-sm leading-6 text-[#62686d]">Use your built-in city wallet for a simulated payment. Available: <strong>{summary?.demo.balance ?? "—"} Demo RLUSD</strong>.</p>
        <label className="block"><span className="wallet-label">Recipient or place</span><input className="wallet-input" autoComplete="off" required value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Museum tickets, cafe, friend…" /></label>
        <label className="mt-4 block"><span className="wallet-label">Amount · Demo RLUSD</span><input className="wallet-input" inputMode="decimal" autoComplete="off" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>
        <label className="mt-4 block"><span className="wallet-label">Note <span className="font-normal text-[#858b90]">(optional)</span></span><input className="wallet-input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What is this for?" /></label>
        <p className="mt-3 text-xs leading-5 text-[#62686d]">Demo funds only. No XRPL transaction will be submitted.</p>
        {error && <p role="alert" className="mt-3 text-sm text-[#b3261e]">{error}</p>}
        <button type="submit" className="wallet-primary-button mt-5 min-h-11 w-full rounded-[9px] bg-[#0039a6] px-5 text-sm font-semibold text-white">Review payment</button>
      </form>
    )}
  </DialogFrame>;
}

function ConvertDialog({ amount: initialAmount, onClose }: { amount: string; onClose: () => void }) {
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState("EUR");
  const [estimate, setEstimate] = useState<WalletFxEstimate | null>(null);
  const [quote, setQuote] = useState<WalletSwapQuote | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadEstimate() {
    setFxLoading(true);
    setError("");
    try { setEstimate(await getWalletFxEstimate(amount)); }
    catch { setEstimate(null); setError("Fiat estimate is unavailable right now."); }
    finally { setFxLoading(false); }
  }

  async function loadQuote() {
    setQuoteLoading(true);
    setError("");
    try { setQuote(await getWalletSwapQuote("RLUSD", "XRP", amount)); }
    catch { setQuote(null); setError("XRPL Testnet quote is unavailable right now."); }
    finally { setQuoteLoading(false); }
  }

  return <DialogFrame title="Convert" onClose={onClose}>
    <p className="text-sm leading-6 text-[#62686d]">View an approximate fiat value or check a read-only RLUSD → XRP Testnet quote. No conversion is executed here.</p>
    <label className="mt-5 block"><span className="wallet-label">RLUSD amount</span><input className="wallet-input" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setEstimate(null); setQuote(null); }} /></label>
    <section className="mt-5 rounded-xl border border-[#e0e3df] p-4" aria-labelledby="fiat-estimate-heading">
      <div className="flex items-center justify-between gap-3"><h3 id="fiat-estimate-heading" className="text-sm font-semibold">Estimated fiat value</h3><select className="wallet-input w-auto min-w-24" aria-label="Fiat estimate currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{["USD", "EUR", "GBP", "CAD", "MXN", "PEN", "JPY"].map((code) => <option key={code}>{code}</option>)}</select></div>
      <p className="mt-4 text-2xl font-semibold">{fxLoading ? "Loading…" : estimate?.available && estimate.values[currency as keyof WalletFxEstimate["values"]] ? estimate.values[currency as keyof WalletFxEstimate["values"]] + " " + currency : "—"}</p>
      <p className="mt-1 text-[10px] leading-4 text-[#747b80]">Indicative only; not a fiat settlement or redemption value.</p>
      <button type="button" disabled={fxLoading || !amount} onClick={() => void loadEstimate()} className="wallet-secondary-button mt-3 min-h-9 rounded-lg border border-[#d3d8d4] px-3 text-xs font-semibold disabled:opacity-50">{fxLoading ? "Updating…" : "Update estimate"}</button>
      <a className="ml-3 text-[10px] text-[#0039a6] underline" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by ExchangeRate-API</a>
      {estimate?.rateDate && <p className="mt-2 text-[10px] text-[#747b80]">Rate date: {estimate.rateDate}</p>}
    </section>
    <section className="mt-4 rounded-xl border border-[#e0e3df] p-4" aria-labelledby="xrpl-quote-heading">
      <h3 id="xrpl-quote-heading" className="text-sm font-semibold">XRPL Testnet swap quote</h3>
      <button type="button" disabled={quoteLoading || !amount} onClick={() => void loadQuote()} className="wallet-secondary-button mt-3 min-h-9 rounded-lg border border-[#d3d8d4] px-3 text-xs font-semibold disabled:opacity-50">{quoteLoading ? "Checking ledger…" : "Check RLUSD → XRP quote"}</button>
      {quote && <p role="status" className="mt-3 text-xs leading-5 text-[#62686d]">{quote.available ? "Estimated output: " + quote.estimatedOutput + " XRP · " + quote.source + " · ledger " + (quote.ledgerIndex ?? "unavailable") : quote.reason}</p>}
      <p className="mt-2 text-[10px] leading-4 text-[#747b80]">Quote is indicative and does not submit a swap transaction.</p>
    </section>
    {error && <p role="status" className="mt-3 text-xs text-[#747b80]">{error}</p>}
  </DialogFrame>;
}
