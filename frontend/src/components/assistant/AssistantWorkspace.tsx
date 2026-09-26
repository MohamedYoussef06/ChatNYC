"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantRecommendation } from "@/components/assistant/AssistantRecommendation";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { ChatMessage, type ConversationMessage } from "@/components/assistant/ChatMessage";
import { MemoryPanel } from "@/components/assistant/MemoryPanel";
import { Icon } from "@/components/ui/Icon";
import { recommendations, type Recommendation } from "@/lib/recommendations";

const suggestions = ["Find me cheap food", "Build my Saturday", "Something fun tonight", "Show me somewhere I've never been"];
const initialMessage: ConversationMessage = {
  id: "ock-welcome",
  role: "assistant",
  content: "Hey — what are we getting into today?",
};

type ChatRequest = { message: string; thread_id: string };
type ChatResponse = {
  message: string;
  recommendations: Recommendation[];
  actions: { type: "view_place" | "navigate"; place_id: string }[];
  memory_updates: string[];
};

function getMockResponse({ message }: ChatRequest): ChatResponse {
  const text = message.toLowerCase();
  const categories = new Set<Recommendation["category"]>();
  if (/cheap|budget|food|eat|slice|pizza/.test(text)) categories.add("Food & drink");
  if (/music|jazz|concert|show|tonight|fun/.test(text)) categories.add("Live music");
  if (/saturday|weekend|itinerary|build my day|day out/.test(text)) {
    categories.add("Events");
    categories.add("Outdoors");
  }
  if (/neighborhood|never been|somewhere new|explore/.test(text)) {
    categories.add("Neighborhoods");
    categories.add("Culture");
  }

  const matches = categories.size
    ? recommendations.filter((place) => categories.has(place.category)).slice(0, 3)
    : recommendations.slice(0, 2);
  const remembersJazz = /i (love|like) jazz|jazz is my/.test(text);

  let reply = "Tell me the kind of day you want and I’ll find a good place to start.";
  if (/cheap|budget/.test(text) && /music|jazz|tonight/.test(text)) reply = "Say less. I’d keep you downtown tonight. Here are a couple places that fit.";
  else if (remembersJazz) reply = "Noted — I’ll keep jazz in mind for you. Here’s a neighborhood spot to start with.";
  else if (/saturday|weekend|itinerary|build my day/.test(text)) reply = "Let’s make a day of it: a little fresh air, then a good market stop.";
  else if (/tonight|fun|music|jazz/.test(text)) reply = "I’ve got a few ideas for tonight. Here are some good places to start.";
  else if (/never been|neighborhood|somewhere new|explore/.test(text)) reply = "Let’s take you somewhere with a different view of the city.";
  else if (/cheap|budget|food|eat/.test(text)) reply = "Good food, easy on the wallet. Try one of these NYC favorites.";

  return {
    message: reply,
    recommendations: matches,
    actions: matches.map((place) => ({ type: "navigate", place_id: place.id })),
    memory_updates: remembersJazz ? ["Jazz"] : [],
  };
}

export function AssistantWorkspace() {
  const [messages, setMessages] = useState<ConversationMessage[]>([initialMessage]);
  const [preferences, setPreferences] = useState(["Live music", "Budget spots", "Walking"]);
  const conversationRef = useRef<HTMLDivElement>(null);
  const threadId = useRef("ock-local-demo-thread");

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function sendMessage(message: string) {
    const text = message.trim();
    if (!text) return;

    const request: ChatRequest = { message: text, thread_id: threadId.current };
    const response = getMockResponse(request);
    setMessages((current) => [
      ...current,
      { id: `user-${current.length}`, role: "user", content: text },
      { id: `ock-${current.length + 1}`, role: "assistant", content: response.message, recommendations: response.recommendations },
    ]);
    if (response.memory_updates.length) {
      setPreferences((current) => Array.from(new Set([...current, ...response.memory_updates])));
    }
  }

  return (
    <div className="relative left-1/2 -mt-12 w-screen max-w-none -translate-x-1/2 px-5 pb-10 sm:px-8 xl:px-12 2xl:px-16">
      <div className="mx-auto max-w-[1520px]">
        <header className="border-b border-[#e3e4e0] pb-5 pt-8 sm:pb-6 sm:pt-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0039a6]">
                <span className="flex size-5 items-center justify-center rounded-md bg-[#0039a6] text-white"><Icon name="sparkles" size={12} /></span>
                Ock
              </p>
              <h1 className="text-[2.35rem] font-semibold leading-none tracking-[-0.055em] text-[#151719] sm:text-[2.8rem]">Your NYC sidekick.</h1>
              <p className="mt-3 text-sm text-[#5f6469] sm:text-[15px]">Ask about the city, make a plan, or figure out where to go next.</p>
            </div>
            <span className="mb-0.5 inline-flex items-center gap-2 rounded-full border border-[#dce5df] bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-[#17663b]"><span className="size-1.5 rounded-full bg-[#21874e]" /> Ready</span>
          </div>
        </header>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)] lg:gap-6">
          <section aria-label="Conversation with Ock" className="flex h-[min(74dvh,820px)] min-h-[590px] flex-col overflow-hidden rounded-2xl border border-[#e0e3df] bg-white shadow-[0_5px_20px_rgba(21,23,25,0.045)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e6e8e4] px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0039a6] text-white"><Icon name="sparkles" size={18} /></span>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#202428]">Ock</p><p className="text-[10px] text-[#687076]">Your NYC sidekick</p></div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.11em] text-[#5d666b]"><span className="size-1.5 rounded-full bg-[#21874e]" /> Ready to chat</span>
            </div>

            <div ref={conversationRef} aria-live="polite" aria-relevant="additions" className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
                {messages.length === 1 && (
                  <div className="ml-11 mt-1">
                    <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.13em] text-[#71777c]">A few places to start</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} className="min-h-9 rounded-full border border-[#dfe2df] bg-[#fffefa] px-3.5 text-[11px] font-medium text-[#41474c] transition-colors hover:border-[#0039a6] hover:bg-[#f0f4fc] hover:text-[#0039a6]">{suggestion}</button>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <ChatComposer onSend={sendMessage} />
          </section>

          <aside className="hidden lg:block">
            <MemoryPanel preferences={preferences} />
          </aside>
        </div>

        <details className="mt-4 rounded-xl border border-[#e0e3df] bg-white lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-[#252a2e]">
            Ock knows <span className="text-[10px] font-medium text-[#697076]">Demo preferences &amp; today</span>
            <Icon name="chevron-down" size={17} className="text-[#626b70]" />
          </summary>
          <div className="border-t border-[#e6e8e4] p-3"><MemoryPanel preferences={preferences} compact /></div>
        </details>

        <p className="mt-4 text-center text-[9px] leading-4 text-[#777d82] sm:text-left">Ock&apos;s replies and preferences are demo-only. Your conversation isn&apos;t being saved.</p>
      </div>
    </div>
  );
}
