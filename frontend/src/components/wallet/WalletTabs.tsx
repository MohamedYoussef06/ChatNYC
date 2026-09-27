"use client";

import { useRef, type KeyboardEvent } from "react";

export type WalletTab = "wallet" | "split";

const tabs: Array<{ id: WalletTab; label: string }> = [
  { id: "wallet", label: "Wallet" },
  { id: "split", label: "Split" },
];

export function WalletTabs({ activeTab, onChange }: { activeTab: WalletTab; onChange: (tab: WalletTab) => void }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
        : event.key === "ArrowRight" ? (index + 1) % tabs.length
          : (index - 1 + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="wallet-tabs relative grid w-full max-w-[360px] grid-cols-2 rounded-[11px] border border-[#dfe2df] bg-[#f0f1ed] p-1" role="tablist" aria-label="Wallet views">
      <span aria-hidden="true" className="wallet-tab-indicator absolute inset-y-1 left-1 w-[calc(50%_-_4px)] rounded-[8px] border border-[#d9dcdf] bg-white shadow-[0_1px_3px_rgba(21,23,25,0.08)]" data-tab={activeTab} />
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(node) => { tabRefs.current[index] = node; }}
          type="button"
          role="tab"
          id={`wallet-${tab.id}-tab`}
          aria-selected={activeTab === tab.id}
          aria-controls={`wallet-${tab.id}-panel`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={`relative z-10 min-h-10 rounded-[8px] px-4 text-sm font-semibold transition-colors ${activeTab === tab.id ? "text-[#151719]" : "text-[#686e73]"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
