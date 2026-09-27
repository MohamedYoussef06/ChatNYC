"use client";

import { useState, type FormEvent } from "react";
import { normalizePhone } from "@/lib/phone";
import { sendTripPlan } from "@/lib/trips";

export function TextPlanForm({
  tripId,
  saving = false,
  variant = "ock",
  onSent,
}: {
  tripId: string | null;
  saving?: boolean;
  variant?: "ock" | "nextstop";
  onSent?: (phone: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Use a full number, like +14155551234.");
      return;
    }
    if (!tripId) {
      setError(saving ? "Ock is still saving this plan." : "This plan is not saved yet.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      await sendTripPlan(tripId, normalized);
      setStatus("sent");
      onSent?.(normalized);
    } catch (cause) {
      setStatus("idle");
      setError(cause instanceof Error ? cause.message : "Could not text this plan.");
    }
  }

  const inputClass = variant === "nextstop"
    ? "nextstop-input h-11 w-full rounded-lg border border-[#d9dcd9] bg-white px-3 text-sm text-[#24282c] outline-none"
    : "h-10 w-full rounded-[8px] border border-[#d8dce0] bg-white px-3 text-[12px] text-[#202428] outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/10";

  return (
    <form onSubmit={(event) => void submit(event)} className={variant === "nextstop" ? "mt-6 border-t border-[#eceeeb] pt-5" : "mt-4 rounded-[10px] border border-[#e2e5e2] bg-[#fafaf7] p-3.5"}>
      <p className={variant === "nextstop" ? "text-sm font-semibold text-[#191c1e]" : "text-[9px] font-bold uppercase tracking-[0.12em] text-[#0039a6]"}>
        Text me this plan
      </p>
      <p className={variant === "nextstop" ? "mt-1 text-[10px] leading-4 text-[#747b80]" : "mt-1 text-[10px] leading-4 text-[#72797e]"}>
        {saving ? "Saving the plan, then Ock can iMessage it." : "Ock will iMessage the full itinerary to this number."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Phone number</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 415 555 1234"
            value={phone}
            onChange={(event) => { setPhone(event.target.value); setStatus("idle"); setError(""); }}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={saving || status === "sending" || !phone.trim()}
          className={variant === "nextstop"
            ? "inline-flex min-h-11 items-center rounded-lg bg-[#0039a6] px-4 text-xs font-semibold text-white disabled:opacity-60"
            : "ock-primary-action inline-flex min-h-10 items-center rounded-[8px] bg-[#0039a6] px-3.5 text-[10px] font-semibold text-white disabled:opacity-60"}
        >
          {status === "sending" ? "Sending…" : status === "sent" ? "Sent" : "Send iMessage"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-[10px] text-[#b3261e]">{error}</p>}
      {status === "sent" && !error && <p role="status" className="mt-2 text-[10px] text-[#17663b]">Sent. Check iMessage for the full plan.</p>}
    </form>
  );
}
