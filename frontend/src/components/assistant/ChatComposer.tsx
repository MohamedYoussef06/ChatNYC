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
    <form onSubmit={submit} className="rounded-[14px] border border-[#d9dcd9] bg-white p-2.5 shadow-[0_2px_8px_rgba(21,23,25,0.04)] focus-within:border-[#0039a6] focus-within:ring-2 focus-within:ring-[#0039a6]/10 sm:p-3">
      <label htmlFor="ock-composer" className="sr-only">Tell Ock what you want to do</label>
      <div className="flex items-center gap-2.5">
        <Icon name="bagel" size={18} className="ml-1 shrink-0 text-[#0039a6]" />
        <textarea id="ock-composer" rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }} placeholder="Tell Ock what you want to do..." className="max-h-28 min-h-11 min-w-0 flex-1 resize-y bg-transparent px-1 py-2.5 text-sm leading-5 text-[#202428] outline-none placeholder:text-[#7a8085]" />
        <button type="button" disabled title="Voice input is coming later" aria-label="Voice input is coming later" className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-[#e0e2df] text-[#687076] disabled:cursor-not-allowed disabled:opacity-70 sm:flex">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0m-7 7v3m-4 0h8" /></svg>
        </button>
        <button type="submit" disabled={!draft.trim()} aria-label="Send request to Ock" className="flex size-10 shrink-0 items-center justify-center rounded-[9px] bg-[#0039a6] text-white transition-colors hover:bg-[#002d85] disabled:cursor-not-allowed disabled:bg-[#aab8d1]"><Icon name="arrow-right" size={18} /></button>
      </div>
    </form>
  );
}
