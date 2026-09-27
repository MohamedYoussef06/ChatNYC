"use client";

import { useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";

interface Participant {
  id: string;
  name: string;
  isYou?: boolean;
}

interface SplitPreview {
  each: number;
  people: number;
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function SplitExpense() {
  const [expense, setExpense] = useState("Dinner at Smalls");
  const [totalInput, setTotalInput] = useState("80.00");
  const [note, setNote] = useState("");
  const [personName, setPersonName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    { id: "you", name: "You", isYou: true },
    { id: "akeelah", name: "Akeelah" },
  ]);
  const [preview, setPreview] = useState<SplitPreview | null>(null);
  const nextParticipantId = useRef(1);
  const total = Number.parseFloat(totalInput) || 0;
  const each = participants.length > 0 ? total / participants.length : 0;
  const formatted = useMemo(() => ({ total: money.format(total), each: money.format(each) }), [total, each]);

  function addPerson() {
    const name = personName.trim();
    if (!name) return;
    setParticipants((current) => [...current, { id: `person-${nextParticipantId.current++}`, name }]);
    setPersonName("");
    setPreview(null);
  }

  function submitSplit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expense.trim() || total <= 0 || participants.length === 0) return;
    setPreview({ each, people: participants.length });
  }

  return (
    <form onSubmit={submitSplit} className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <section className="wallet-panel rounded-[16px] border border-[#dfe2df] bg-white p-6 sm:p-8" style={{ "--wallet-delay": "80ms" } as CSSProperties} aria-labelledby="split-expense-heading">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">Local preview</p>
        <h2 id="split-expense-heading" className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Split an expense</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#666c71]">Split dinner, tickets, rides, or anything else with your group.</p>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="wallet-label">Expense</span><input value={expense} onChange={(event) => { setExpense(event.target.value); setPreview(null); }} className="wallet-input" required /></label>
          <label><span className="wallet-label">Total</span><span className="relative block"><span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#6f757a]">$</span><input value={totalInput} onChange={(event) => { setTotalInput(event.target.value); setPreview(null); }} className="wallet-input pl-7" inputMode="decimal" aria-describedby="split-total-help" required /></span><span id="split-total-help" className="sr-only">Enter the total amount in US dollars.</span></label>
          <label><span className="wallet-label">Optional note</span><input value={note} onChange={(event) => setNote(event.target.value)} className="wallet-input" placeholder="What is this for?" /></label>
        </div>

        <fieldset className="mt-7 border-t border-[#eceeeb] pt-6">
          <legend className="wallet-label px-0">People</legend>
          <div className="mt-2 flex gap-2">
            <input value={personName} onChange={(event) => setPersonName(event.target.value)} className="wallet-input min-w-0 flex-1" placeholder="Add a name" aria-label="Participant name" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addPerson(); } }} />
            <button type="button" onClick={addPerson} className="wallet-secondary-button min-h-11 rounded-[9px] border border-[#cfd4d0] bg-[#fafaf8] px-4 text-xs font-semibold">Add person</button>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="People in this split">
            {participants.map((participant) => (
              <li key={participant.id} className="flex min-h-9 items-center gap-2 rounded-full border border-[#dfe2df] bg-[#fafaf8] pl-3 pr-2 text-xs font-semibold">
                <span>{participant.name}</span>
                {participant.isYou ? <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#0039a6]">Current</span> : <button type="button" aria-label={`Remove ${participant.name}`} onClick={() => { setParticipants((current) => current.filter((person) => person.id !== participant.id)); setPreview(null); }} className="rounded-full p-1 text-[#747b80] hover:text-[#151719]"><Icon name="close" size={11} /></button>}
              </li>
            ))}
          </ul>
        </fieldset>
      </section>

      <aside className="wallet-panel h-fit rounded-[16px] border border-[#dfe2df] bg-[#f6f7f3] p-6 sm:p-7" style={{ "--wallet-delay": "150ms" } as CSSProperties} aria-labelledby="split-summary-heading">
        <h2 id="split-summary-heading" className="text-lg font-semibold tracking-[-0.025em]">Split summary</h2>
        <dl className="mt-5 divide-y divide-[#dfe2df] border-y border-[#dfe2df] text-sm">
          <div className="flex justify-between gap-4 py-3"><dt className="text-[#666c71]">Total</dt><dd className="font-semibold">{formatted.total}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-[#666c71]">People</dt><dd className="font-semibold">{participants.length}</dd></div>
          <div className="flex justify-between gap-4 py-3"><dt className="text-[#666c71]">Each</dt><dd className="font-semibold text-[#0039a6]">{formatted.each}</dd></div>
        </dl>
        <button type="submit" disabled={!expense.trim() || total <= 0 || participants.length === 0} className="wallet-primary-button mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-[9px] bg-[#0039a6] px-5 text-sm font-semibold text-white disabled:opacity-50">
          Create split <Icon name="arrow-right" size={15} className="wallet-action-arrow" />
        </button>
        <p className="mt-3 text-[10px] leading-5 text-[#73797e]">Creates a local preview only. No funds will move.</p>
        {preview && (
          <div role="status" className="wallet-notice mt-5 rounded-[10px] border border-[#bfd0ec] bg-[#edf2fb] p-4">
            <p className="text-sm font-semibold text-[#102859]">Split created</p>
            <p className="mt-1 text-xs leading-5 text-[#4d5f7a]">{money.format(preview.each)} per person for {preview.people} {preview.people === 1 ? "person" : "people"}.</p>
            <p className="mt-2 text-[10px] leading-4 text-[#66748a]">Payment settlement will become available when the wallet is connected.</p>
          </div>
        )}
      </aside>
    </form>
  );
}
