"use client";

import { useEffect, useState } from "react";
import { forgetOckMemory, listOckMemories, type OckMemory as OckMemoryItem } from "@/lib/ock-api";

export function OckMemory() {
  const [memories, setMemories] = useState<OckMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState("");
  const [forgetting, setForgetting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await listOckMemories();
      setAvailable(result.available);
      setMemories(result.memories);
      if (!result.available) setError(result.message ?? "Ock memory is temporarily unavailable.");
    } catch {
      setAvailable(false);
      setError("Ock memory is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function forget(id: string) {
    setForgetting(id);
    setError("");
    try {
      await forgetOckMemory(id);
      setMemories((current) => current.filter((memory) => memory.id !== id));
    } catch {
      setError("That memory could not be forgotten. Please try again.");
    } finally {
      setForgetting(null);
    }
  }

  return (
    <section id="memory" aria-labelledby="ock-memory-title" className="mt-8 overflow-hidden rounded-[16px] border border-[#dfe3df] bg-[#fffefa]">
      <header className="border-b border-[#e5e8e4] px-5 py-4 sm:px-6">
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#0039a6]">Backboard</p>
        <h2 id="ock-memory-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#202428]">Ock Memory</h2>
        <p className="mt-1 text-xs leading-5 text-[#6b7277]">Durable preferences Ock may use across conversations in this browser session.</p>
      </header>
      <div className="p-3 sm:p-4">
        {loading ? <p role="status" className="p-4 text-sm text-[#6b7277]">Loading Ock memory…</p> : error ? (
          <div role="alert" className="rounded-xl border border-[#eadad6] bg-[#fff8f6] p-4 text-sm text-[#8d3028]">
            <p>{error}</p><button type="button" onClick={() => { void load(); }} className="mt-3 min-h-10 rounded-lg border border-[#d6aaa4] px-4 text-xs font-semibold">Try again</button>
          </div>
        ) : available && memories.length ? memories.map((memory) => (
          <article key={memory.id} className="flex items-start justify-between gap-4 border-b border-[#e8eae7] px-2 py-4 last:border-0">
            <div><p className="text-sm leading-6 text-[#30363a]">{memory.content}</p>{(memory.updated_at || memory.created_at) && <p className="mt-1 text-[10px] text-[#858b8f]">Remembered {new Date(memory.updated_at || memory.created_at || "").toLocaleDateString()}</p>}</div>
            <button type="button" disabled={forgetting === memory.id} onClick={() => { void forget(memory.id); }} className="min-h-10 shrink-0 rounded-lg border border-[#dfe2df] px-3 text-[10px] font-semibold text-[#565d62] hover:border-[#a22c25] hover:text-[#a22c25] disabled:opacity-50">{forgetting === memory.id ? "Forgetting…" : "Forget"}</button>
          </article>
        )) : <div className="p-7 text-center"><p className="text-sm font-semibold text-[#30363a]">Nothing saved yet.</p><p className="mt-1 text-xs leading-5 text-[#737a7f]">When you tell Ock a durable mobility preference, it can appear here after Backboard processes it.</p></div>}
      </div>
    </section>
  );
}
