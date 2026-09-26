"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";

export function ChatComposer({ onSend }: { onSend: (message: string) => void }) {
  const [draft, setDraft] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;
    onSend(message);
    setDraft("");
  }

  return (
    <form onSubmit={submit} className="border-t border-[#e6e8e4] bg-[#fffefa] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-xl border border-[#d9dcd9] bg-white p-2.5 shadow-[0_2px_8px_rgba(21,23,25,0.035)] focus-within:border-[#0039a6] focus-within:ring-2 focus-within:ring-[#0039a6]/10">
        <label htmlFor="ock-composer" className="sr-only">Message Ock</label>
        <textarea id="ock-composer" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask Ock anything about NYC..." className="max-h-32 min-h-12 w-full resize-y bg-transparent px-2 py-1 text-sm leading-6 text-[#202428] outline-none placeholder:text-[#7a8085]" />
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-medium text-[#767c81]"><Icon name="bagel" size={13} className="text-[#0039a6]" /> Local demo · no conversation saved</span>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" disabled title="Voice input is coming later" aria-label="Voice input is coming later" className="flex size-9 items-center justify-center rounded-lg border border-[#e0e2df] text-[#687076] disabled:cursor-not-allowed disabled:opacity-70">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0m-7 7v3m-4 0h8" /></svg>
            </button>
            <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="flex size-9 items-center justify-center rounded-lg bg-[#0039a6] text-white transition-colors hover:bg-[#002d85] disabled:cursor-not-allowed disabled:bg-[#aab8d1]"><Icon name="arrow-right" size={17} /></button>
          </div>
        </div>
      </div>
    </form>
  );
}
