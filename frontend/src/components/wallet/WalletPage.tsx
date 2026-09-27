"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { SplitExpense } from "@/components/wallet/SplitExpense";
import { WalletDialogs } from "@/components/wallet/WalletDialogs";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletTabs, type WalletTab } from "@/components/wallet/WalletTabs";
import { getWalletSummary, getWalletTransactions } from "@/lib/wallet";
import type { WalletSummary, WalletTransactionReport } from "@/types/wallet";

type WalletAction = "receive" | "send" | "convert";

export function WalletPage() {
  const [activeTab, setActiveTab] = useState<WalletTab>("wallet");
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionReport | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<WalletAction | null>(null);
  const [initialSendAmount, setInitialSendAmount] = useState<string | undefined>();

  const refreshWallet = useCallback(async (signal?: AbortSignal) => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      setSummary(await getWalletSummary(signal));
    } catch (cause) {
      if (signal?.aborted) return;
      setWalletError(cause instanceof Error ? cause.message : "Wallet balances are temporarily unavailable.");
      setSummary(null);
    } finally {
      if (!signal?.aborted) setWalletLoading(false);
    }
  }, []);

  const refreshTransactions = useCallback(async (signal?: AbortSignal) => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    try {
      setTransactions(await getWalletTransactions(signal));
    } catch (cause) {
      if (signal?.aborted) return;
      setTransactionsError(cause instanceof Error ? cause.message : "Transaction activity is temporarily unavailable.");
      setTransactions(null);
    } finally {
      if (!signal?.aborted) setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshWallet(controller.signal);
    void refreshTransactions(controller.signal);
    return () => controller.abort();
  }, [refreshWallet, refreshTransactions]);

  function changeTab(tab: WalletTab) {
    setActiveTab(tab);
    setNotice(null);
  }

  function openAction(action: WalletAction, amount?: string) {
    setInitialSendAmount(action === "send" ? amount : undefined);
    setDialog(action);
  }

  async function copyAddress() {
    const address = summary?.address;
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setNotice("XRPL Testnet address copied.");
    } catch {
      setNotice("Copy is unavailable in this browser. Select the address in Wallet details.");
    }
  }

  return (
    <div className="wallet-page relative left-1/2 -mt-12 w-screen max-w-none -translate-x-1/2 px-5 pb-14 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1248px]">
        <header className="border-b border-[#dfe2df] pb-7 pt-10 sm:pb-8 sm:pt-12">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="wallet-enter text-[10px] font-bold uppercase tracking-[0.17em] text-[#0039a6]" style={{ "--wallet-delay": "30ms" } as CSSProperties}>Wallet</p>
              <h1 className="wallet-enter mt-2 text-[38px] font-semibold tracking-[-0.055em] text-[#151719] sm:text-[52px]" style={{ "--wallet-delay": "90ms" } as CSSProperties}>Your city wallet.</h1>
              <p className="wallet-enter mt-3 max-w-2xl text-sm leading-6 text-[#62686d] sm:text-base" style={{ "--wallet-delay": "145ms" } as CSSProperties}>The payment layer of ChatNYC, running on XRPL Testnet.</p>
            </div>
            <span className="wallet-enter inline-flex items-center gap-2 rounded-full border border-[#ccd6e6] bg-[#edf2fb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#0039a6]" style={{ "--wallet-delay": "180ms" } as CSSProperties}><span className="size-1.5 rounded-full bg-[#0039a6]" />Testnet · Demo funds</span>
          </div>
        </header>

        <div className="wallet-enter py-6" style={{ "--wallet-delay": "220ms" } as CSSProperties}>
          <WalletTabs activeTab={activeTab} onChange={changeTab} />
        </div>

        <div id={"wallet-" + activeTab + "-panel"} role="tabpanel" aria-labelledby={"wallet-" + activeTab + "-tab"} tabIndex={0} key={activeTab} className="wallet-tab-panel rounded-sm focus:outline-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#0039a6]">
          {activeTab === "wallet" ? (
            <WalletOverview
              summary={summary}
              transactions={transactions}
              walletLoading={walletLoading}
              walletError={walletError}
              transactionsLoading={transactionsLoading}
              transactionsError={transactionsError}
              notice={notice}
              onAction={(action) => openAction(action)}
              onDismissNotice={() => setNotice(null)}
              onCopyAddress={() => void copyAddress()}
            />
          ) : (
            <SplitExpense onPaid={() => { void refreshWallet(); setNotice("Your Demo RLUSD split payment was recorded."); }} />
          )}
        </div>
      </div>

      <WalletDialogs
        dialog={dialog}
        summary={summary}
        initialAmount={initialSendAmount}
        onClose={() => setDialog(null)}
        onRefresh={() => {
          void refreshWallet();
          void refreshTransactions();
        }}
      />
    </div>
  );
}
