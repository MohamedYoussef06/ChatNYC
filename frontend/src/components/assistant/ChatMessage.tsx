import { AssistantRecommendation } from "@/components/assistant/AssistantRecommendation";
import { Icon } from "@/components/ui/Icon";
import type { Recommendation } from "@/lib/recommendations";

export type ConversationMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  recommendations?: Recommendation[];
};

export function ChatMessage({ message }: { message: ConversationMessage }) {
  if (message.role === "user") {
    return (
      <article className="flex justify-end" aria-label="Your message">
        <p className="max-w-[88%] rounded-2xl rounded-br-md bg-[#edf2fa] px-4 py-3 text-sm leading-6 text-[#202a37] sm:max-w-[78%]">{message.content}</p>
      </article>
    );
  }

  return (
    <article className="flex items-start gap-3" aria-label="Ock message">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0039a6] text-white"><Icon name="sparkles" size={15} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><p className="text-[11px] font-semibold text-[#252a2e]">Ock</p><span className="text-[9px] text-[#7a8085]">Your NYC sidekick</span></div>
        <p className="mt-1.5 text-sm leading-6 text-[#41474c]">{message.content}</p>
        {message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {message.recommendations.map((place) => <AssistantRecommendation key={place.id} place={place} />)}
          </div>
        )}
        <button type="button" disabled title="Voice playback is coming later" aria-label="Listen to this Ock message. Voice playback is coming later." className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-[10px] font-medium text-[#7a8085] disabled:cursor-not-allowed disabled:opacity-75">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4h4l5 4V6l-5 4H4Z" /><path d="M17 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" /></svg>
          Listen <span className="sr-only">(coming later)</span>
        </button>
      </div>
    </article>
  );
}
