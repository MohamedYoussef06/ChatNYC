"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { OckContextPanel } from "@/components/assistant/OckContextPanel";
import { OckResultWorkspace } from "@/components/assistant/OckResultWorkspace";
import type { ConversationMessage } from "@/components/assistant/ChatMessage";
import { Icon } from "@/components/ui/Icon";
import { resolveOckRequest, type OckMockResponse } from "@/lib/ockMock";

function initialMessages(query: string): ConversationMessage[] {
  const text = query.trim();
  if (!text) return [];
  const response = resolveOckRequest(text);
  return [
    { id: "user-initial", role: "user", content: text },
    { id: "ock-initial", role: "assistant", content: response.message },
  ];
}

export function AssistantWorkspace({ initialQuery = "" }: { initialQuery?: string }) {
  const [response, setResponse] = useState<OckMockResponse>(() => resolveOckRequest(initialQuery));
  const [messages, setMessages] = useState<ConversationMessage[]>(() => initialMessages(initialQuery));
  const [resultVersion, setResultVersion] = useState(0);
  const [resultPhase, setResultPhase] = useState<"entering" | "exiting">("entering");
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseRef = useRef(response);

  useEffect(() => () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
  }, []);

  function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message) return;
    const nextResponse = resolveOckRequest(message, responseRef.current);
    responseRef.current = nextResponse;
    setMessages((current) => [
      ...current,
      { id: `user-${current.length}`, role: "user", content: message },
      { id: `ock-${current.length + 1}`, role: "assistant", content: nextResponse.message },
    ]);
    if (resultTimer.current) clearTimeout(resultTimer.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setResponse(nextResponse);
      setResultVersion((current) => current + 1);
      setResultPhase("entering");
      resultTimer.current = null;
      return;
    }
    setResultPhase("exiting");
    resultTimer.current = setTimeout(() => {
      setResponse(nextResponse);
      setResultVersion((current) => current + 1);
      setResultPhase("entering");
      resultTimer.current = null;
    }, 140);
  }

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
            <div key={resultVersion} className={`ock-workspace-content ock-workspace-content-${resultPhase}`}>
              <OckResultWorkspace response={response} onPrompt={sendMessage} />
            </div>
          </section>
        </div>

        <div className="ock-composer-enter sticky bottom-0 z-20 mt-3 border-t border-[#e2e5e2] bg-[#faf9f6] py-2 sm:py-3">
          <div className="mx-auto max-w-[1120px]">
            <ChatComposer onSend={sendMessage} />
            <p className="mt-1.5 text-center text-[9px] text-[#81878b]">Ock is shaping a demo result · mock places and plans, no live data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
