"use client";

import { useState, type CSSProperties } from "react";
import { SplitExpense } from "@/components/wallet/SplitExpense";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletTabs, type WalletTab } from "@/components/wallet/WalletTabs";
import type { WalletAccount, WalletAsset, WalletTransaction } from "@/types/wallet";

const templateAccount: WalletAccount = {
  connectionStatus: "disconnected",
  address: null,
  network: null,
  availableBalance: "0.00",
  currency: "USD",
  isDemo: true,
};

const templateAssets: WalletAsset[] = [
  { id: "rlusd", name: "Ripple USD", symbol: "RLUSD", balance: "$0.00", fiatValue: "$0.00 USD", isTemplate: true },
  { id: "xrp", name: "XRP", symbol: "XRP", balance: "0 XRP", fiatValue: null, isTemplate: true },
];

const templateTransactions: WalletTransaction[] = [];

export function WalletPage() {
  const [activeTab, setActiveTab] = useState<WalletTab>("wallet");
  const [notice, setNotice] = useState<string | null>(null);

  function changeTab(tab: WalletTab) {
    setActiveTab(tab);
    setNotice(null);
  }

  return (
    <div className="wallet-page relative left-1/2 -mt-12 w-screen max-w-none -translate-x-1/2 px-5 pb-14 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1248px]">
        <header className="border-b border-[#dfe2df] pb-7 pt-10 sm:pb-8 sm:pt-12">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="wallet-enter text-[10px] font-bold uppercase tracking-[0.17em] text-[#0039a6]" style={{ "--wallet-delay": "30ms" } as CSSProperties}>Wallet</p>
              <h1 className="wallet-enter mt-2 text-[38px] font-semibold tracking-[-0.055em] text-[#151719] sm:text-[52px]" style={{ "--wallet-delay": "90ms" } as CSSProperties}>Your city wallet.</h1>
              <p className="wallet-enter mt-3 max-w-2xl text-sm leading-6 text-[#62686d] sm:text-base" style={{ "--wallet-delay": "145ms" } as CSSProperties}>Manage funds, payments, and shared expenses.</p>
            </div>
            <span className="wallet-enter inline-flex items-center gap-2 rounded-full border border-[#ccd6e6] bg-[#edf2fb] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#0039a6]" style={{ "--wallet-delay": "180ms" } as CSSProperties}><span className="size-1.5 rounded-full bg-[#0039a6]" />Demo wallet</span>
          </div>
        </header>

        <div className="wallet-enter py-6" style={{ "--wallet-delay": "220ms" } as CSSProperties}>
          <WalletTabs activeTab={activeTab} onChange={changeTab} />
        </div>

        <div id={`wallet-${activeTab}-panel`} role="tabpanel" aria-labelledby={`wallet-${activeTab}-tab`} tabIndex={0} key={activeTab} className="wallet-tab-panel rounded-sm focus:outline-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#0039a6]">
          {activeTab === "wallet" ? (
            <WalletOverview account={templateAccount} assets={templateAssets} transactions={templateTransactions} notice={notice} onAction={(action) => setNotice(`Wallet connection coming soon. ${action === "receive" ? "Receive" : "Send"} is a preview only.`)} onDismissNotice={() => setNotice(null)} />
          ) : (
            <SplitExpense />
          )}
        </div>
      </div>
    </div>
  );
}
