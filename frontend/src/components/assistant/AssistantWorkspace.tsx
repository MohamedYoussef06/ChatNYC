"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { OckContextPanel } from "@/components/assistant/OckContextPanel";
import { OckResultWorkspace } from "@/components/assistant/OckResultWorkspace";
import type { ConversationMessage } from "@/components/assistant/ChatMessage";
import { Icon } from "@/components/ui/Icon";
import type { OckMockResponse } from "@/lib/ockMock";
import { apiUrl } from "@/lib/api";
import { useUserLocation } from "@/hooks/useUserLocation";
import { readOckTripContext } from "@/lib/ock-context";

export function AssistantWorkspace({ initialQuery = "" }: { initialQuery?: string }) {
  const [response] = useState<OckMockResponse>({ message: "", resultType: "empty", data: { type: "empty" } });
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const requestRef = useRef(0);
  const userLocation = useUserLocation();

  useEffect(() => () => { requestRef.current += 1; }, []);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || assistantLoading) return;
    const request = ++requestRef.current;
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: message },
    ]);
    setAssistantLoading(true);
    const context = {
      ...readOckTripContext(),
      time: new Date().toISOString(),
      ...(userLocation.status === "granted" && userLocation.location ? { location: { latitude: userLocation.location.latitude, longitude: userLocation.location.longitude } } : {}),
    };
    try {
      const result = await fetch(`${apiUrl()}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ message, history, context }),
      });
      if (!result.ok) throw new Error("unavailable");
      const payload: unknown = await result.json();
      const reply = payload && typeof payload === "object" && "reply" in payload && typeof payload.reply === "string" ? payload.reply : "";
      if (!reply.trim()) throw new Error("invalid response");
      if (request === requestRef.current) setMessages((current) => [...current, { id: `ock-${Date.now()}`, role: "assistant", content: reply }]);
    } catch {
      if (request === requestRef.current) setMessages((current) => [...current, { id: `ock-error-${Date.now()}`, role: "assistant", content: "Ock is temporarily unavailable. Please try again." }]);
    } finally {
      if (request === requestRef.current) setAssistantLoading(false);
    }
  }

  useEffect(() => { if (initialQuery.trim()) void sendMessage(initialQuery); }, [initialQuery]);

  return (
    <div className="ock-workspace relative left-1/2 -mt-12 w-screen max-w-none -translate-x-1/2 px-4 pb-8 sm:px-6 xl:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e3e4e0] pb-4 pt-7 sm:pb-5 sm:pt-8">
          <div>
            <p className="ock-page-eyebrow mb-1.5 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.17em] text-[#0039a6]"><span className="flex size-5 items-center justify-center rounded-md bg-[#0039a6] text-white"><Icon name="bagel" size={12} /></span>Ock workspace</p>
            <h1 className="text-[30px] font-semibold leading-none tracking-[-0.055em] text-[#151719] sm:text-[36px]"><span className="ock-title-lead">Your city, in</span><span className="ock-title-motion">motion.</span></h1>
          </div>
          <span className="ock-ready-pill mb-0.5 inline-flex items-center gap-2 rounded-full border border-[#dce5df] bg-white px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#17663b]"><span className="ock-ready-dot size-1.5 rounded-full bg-[#21874e]" /> NYC · Ready</span>
        </header>

        <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(250px,0.29fr)_minmax(0,0.71fr)] lg:gap-4">
          <OckContextPanel messages={messages} onPrompt={sendMessage} />
          <section aria-label="Ock structured result" className="ock-workspace-shell min-h-[530px] overflow-hidden rounded-[16px] border border-[#e0e3df] bg-[#fffefa] shadow-[0_4px_18px_rgba(21,23,25,0.035)] lg:min-h-[620px]">
            <div className="ock-workspace-content"><OckResultWorkspace response={response} onPrompt={sendMessage} /></div>
          </section>
        </div>

        <div className="ock-composer-enter sticky bottom-0 z-20 mt-3 border-t border-[#e2e5e2] bg-[#faf9f6] py-2 sm:py-3">
          <div className="mx-auto max-w-[1120px]">
            <ChatComposer onSend={sendMessage} />
            <p role="status" className="mt-1.5 text-center text-[9px] text-[#81878b]">{assistantLoading ? "Ock is responding…" : "Ock uses only available ChatNYC context."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
