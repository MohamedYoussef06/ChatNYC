"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { OckContextPanel } from "@/components/assistant/OckContextPanel";
import { OckResultWorkspace } from "@/components/assistant/OckResultWorkspace";
import type { ConversationMessage } from "@/components/assistant/ChatMessage";
import { Icon } from "@/components/ui/Icon";
import type { OckMockResponse } from "@/lib/ockMock";
import { useUserLocation } from "@/hooks/useUserLocation";
import { readOckTripContext } from "@/lib/ock-context";
import { getOckConversation, listOckConversations, sendOckMessage, type OckConversation } from "@/lib/ock-api";

export function AssistantWorkspace({ initialQuery = "" }: { initialQuery?: string }) {
  const [response] = useState<OckMockResponse>({ message: "", resultType: "empty", data: { type: "empty" } });
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<OckConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState("");
  const [failedMessageId, setFailedMessageId] = useState("");
  const requestRef = useRef(0);
  const userLocation = useUserLocation();

  useEffect(() => () => { requestRef.current += 1; }, []);

  async function sendMessage(rawMessage: string, retryMessageId?: string) {
    const message = rawMessage.trim();
    if (!message || assistantLoading) return;
    const request = ++requestRef.current;
    const userMessageId = retryMessageId || `user-${Date.now()}`;
    const history = messages.filter(({ id }) => id !== retryMessageId).slice(-10).map(({ role, content }) => ({ role, content }));
    if (!retryMessageId) setMessages((current) => [...current, { id: userMessageId, role: "user", content: message }]);
    setAssistantLoading(true);
    setError("");
    setFailedMessage("");
    setFailedMessageId("");
    const context = {
      ...readOckTripContext(),
      time: new Date().toISOString(),
      ...(userLocation.status === "granted" && userLocation.location ? { location: { latitude: userLocation.location.latitude, longitude: userLocation.location.longitude } } : {}),
    };
    try {
      const result = await sendOckMessage({ message, history, context, conversationId });
      if (request === requestRef.current) {
        setMessages((current) => [...current, { id: `ock-${Date.now()}`, role: "assistant", content: result.reply, ...(result.action ? { action: { label: result.action.label, href: result.action.href } } : {}) }]);
        if (result.conversationId) setConversationId(result.conversationId);
      }
    } catch {
      if (request === requestRef.current) {
        setError("Ock is temporarily unavailable. Your conversation is still here.");
        setFailedMessage(message);
        setFailedMessageId(userMessageId);
      }
    } finally {
      if (request === requestRef.current) setAssistantLoading(false);
    }
  }

  useEffect(() => { if (initialQuery.trim()) void sendMessage(initialQuery); }, [initialQuery]);

  async function newChat() {
    if (assistantLoading) return;
    requestRef.current += 1;
    setMessages([]);
    setConversationId(null);
    setError("");
    setFailedMessage("");
    setFailedMessageId("");
    setHistoryOpen(false);
  }

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setError("");
    try {
      const result = await listOckConversations();
      setConversations(result.conversations);
      if (!result.available) setError(result.message ?? "Ock history is temporarily unavailable.");
    } catch {
      setError("Ock history is temporarily unavailable. Your active conversation is unchanged.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function reopenConversation(id: string) {
    setHistoryLoading(true);
    try {
      const conversation = await getOckConversation(id);
      setMessages((conversation.messages ?? []).map((turn, index) => ({ id: `${id}-${index}`, ...turn })));
      setConversationId(id);
      setHistoryOpen(false);
      setError("");
      setFailedMessage("");
      setFailedMessageId("");
    } catch {
      setError("That conversation could not be reopened. Your active conversation is unchanged.");
    } finally {
      setHistoryLoading(false);
    }
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
          <OckContextPanel messages={messages} onPrompt={sendMessage} loading={assistantLoading} onNewChat={() => { void newChat(); }} onHistory={() => { void openHistory(); }} />
          <section aria-label="Ock structured result" className="ock-workspace-shell min-h-[530px] overflow-hidden rounded-[16px] border border-[#e0e3df] bg-[#fffefa] shadow-[0_4px_18px_rgba(21,23,25,0.035)] lg:min-h-[620px]">
            <div className="ock-workspace-content"><OckResultWorkspace response={response} onPrompt={sendMessage} /></div>
          </section>
        </div>

        <div className="ock-composer-enter sticky bottom-0 z-20 mt-3 border-t border-[#e2e5e2] bg-[#faf9f6] py-2 sm:py-3">
          <div className="mx-auto max-w-[1120px]">
            {error && <div role="alert" className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#ecd6d2] bg-[#fff8f6] px-3 py-2 text-[11px] text-[#8d3028]"><span>{error}</span>{failedMessage && <button type="button" disabled={assistantLoading} onClick={() => { void sendMessage(failedMessage, failedMessageId); }} className="min-h-8 rounded-md border border-[#d5aaa4] px-3 font-semibold">Retry</button>}</div>}
            <ChatComposer onSend={sendMessage} disabled={assistantLoading} />
            <p role="status" className="mt-1.5 text-center text-[9px] text-[#81878b]">{assistantLoading ? "Ock is responding…" : "Ock uses only available ChatNYC context."}</p>
          </div>
        </div>
      </div>
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="ock-history-title" className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-[16px] border border-[#dfe2df] bg-[#fffefa] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#e2e5e2] px-5 py-4">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">Ock</p><h2 id="ock-history-title" className="mt-1 text-lg font-semibold">Chat history</h2></div>
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close history" className="flex size-10 items-center justify-center rounded-lg border border-[#dfe2df]"><Icon name="close" size={17} /></button>
            </header>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {historyLoading ? <p role="status" className="p-4 text-sm text-[#6d7479]">Loading conversations…</p> : error ? <div role="alert" className="m-2 rounded-xl border border-[#eadad6] bg-[#fff8f6] p-4 text-sm text-[#8d3028]"><p>{error}</p><button type="button" onClick={() => { void openHistory(); }} className="mt-3 min-h-9 rounded-lg border border-[#d6aaa4] px-3 text-xs font-semibold">Try again</button></div> : conversations.length ? conversations.map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => { void reopenConversation(conversation.id); }} className="block min-h-14 w-full rounded-xl border-b border-[#e8eae7] px-3 py-3 text-left hover:bg-[#f2f5f1]">
                  <span className="block text-sm font-semibold text-[#252a2e]">{conversation.title}</span>
                  <span className="mt-1 line-clamp-1 block text-[11px] text-[#747b80]">{conversation.preview || "New conversation"}</span>
                </button>
              )) : <div className="p-8 text-center"><p className="text-sm font-semibold">No saved conversations yet.</p><p className="mt-1 text-xs text-[#747b80]">Start a chat and it will appear here when Backboard is available.</p></div>}
            </div>
            <footer className="border-t border-[#e2e5e2] p-3"><button type="button" onClick={() => { void newChat(); }} className="min-h-11 w-full rounded-lg bg-[#0039a6] text-sm font-semibold text-white">Start a new chat</button></footer>
          </section>
        </div>
      )}
    </div>
  );
}
