"use client";

import { ChatMessage, OckThinkingBubble, type ConversationMessage } from "@/components/assistant/ChatMessage";
import { Icon } from "@/components/ui/Icon";
import { useEffect, useRef, type CSSProperties } from "react";

const adjustments = ["Make it cheaper", "No ramen", "Add live music", "Less walking"];

function ConversationFeed({ messages, onPrompt, loading }: { messages: ConversationMessage[]; onPrompt: (prompt: string) => void; loading: boolean }) {
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);
  return (
    <>
      <div ref={feedRef} aria-live="polite" aria-relevant="additions" className="ock-conversation-feed flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length ? messages.map((message) => <ChatMessage key={message.id} message={message} />) : (
          <div className="ock-context-empty my-auto py-8 text-center">
            <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-[#eef3fb] text-[#0039a6]"><Icon name="sparkles" size={16} /></span>
            <p className="mt-3 text-xs font-semibold text-[#31383d]">Ready when you are.</p>
            <p className="mt-1 text-[10px] leading-5 text-[#737a7f]">Tell me what you want to do around the city.</p>
          </div>
        )}
        {loading && <OckThinkingBubble />}
      </div>
      <div className="ock-context-adjust border-t border-[#e7e9e6] px-4 py-3 sm:px-5">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#777e83]">Adjust the result</p>
        <div className="flex flex-wrap gap-1.5">
          {adjustments.map((prompt, index) => (
            <button key={prompt} type="button" onClick={() => onPrompt(prompt)} style={{ "--ock-chip-index": index } as CSSProperties} className="ock-chip ock-adjust-chip min-h-8 rounded-full border border-[#dfe2df] bg-[#fffefa] px-2.5 text-[9px] font-medium text-[#4e565b]">{prompt}</button>
          ))}
        </div>
      </div>
    </>
  );
}

export function OckContextPanel({ messages, onPrompt, loading, onNewChat, onHistory }: { messages: ConversationMessage[]; onPrompt: (prompt: string) => void; loading: boolean; onNewChat: () => void; onHistory: () => void }) {
  return (
    <>
      <aside aria-label="Ock conversation and context" className="ock-context-panel hidden min-h-[620px] flex-col overflow-hidden rounded-[16px] border border-[#e0e3df] bg-white lg:flex">
        <div className="flex items-center justify-between gap-2 border-b border-[#e7e9e6] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-[12px] font-bold tracking-[0.14em] text-[#151719]">OCK</h2>
            <p className="mt-1 text-[10px] text-[#70777c]">Your NYC sidekick</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onHistory} className="min-h-8 rounded-lg border border-[#dfe3e0] px-2 text-[9px] font-semibold text-[#4e565b] hover:border-[#0039a6] hover:text-[#0039a6]">History</button>
            <button type="button" onClick={onNewChat} disabled={loading} className="min-h-8 rounded-lg bg-[#0039a6] px-2.5 text-[9px] font-semibold text-white disabled:opacity-50">New chat</button>
          </div>
        </div>
        <ConversationFeed messages={messages} onPrompt={onPrompt} loading={loading} />
        <p className="border-t border-[#e7e9e6] px-4 py-2.5 text-[9px] text-[#81878b] sm:px-5">Guest history and memory · this browser session</p>
      </aside>

      <details open={loading || undefined} className="ock-context-panel ock-context-panel-mobile rounded-[13px] border border-[#e0e3df] bg-white lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-xs font-semibold text-[#252a2e]">
          <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#21874e]" /> Ock conversation</span>
          <span className="inline-flex items-center gap-1.5 text-[9px] font-medium text-[#747b80]">{loading ? "Thinking…" : messages.length ? `${messages.length} updates` : "Ready"}<Icon name="chevron-down" size={15} /></span>
        </summary>
        <div className="flex h-[260px] flex-col border-t border-[#e7e9e6]">
          <div className="flex gap-2 border-b border-[#e7e9e6] px-4 py-2">
            <button type="button" onClick={onHistory} className="min-h-8 rounded-lg border border-[#dfe3e0] px-3 text-[10px] font-semibold">History</button>
            <button type="button" onClick={onNewChat} disabled={loading} className="min-h-8 rounded-lg bg-[#0039a6] px-3 text-[10px] font-semibold text-white disabled:opacity-50">New chat</button>
          </div>
          <ConversationFeed messages={messages} onPrompt={onPrompt} loading={loading} />
        </div>
      </details>
    </>
  );
}
