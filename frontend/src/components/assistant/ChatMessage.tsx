import { Icon } from "@/components/ui/Icon";

export type ConversationMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export function ChatMessage({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";

  return (
    <article className="ock-chat-message border-b border-[#eceeea] pb-3 last:border-0" aria-label={isUser ? "Your request" : "Ock response"}>
      <div className="flex items-start gap-2.5">
        {!isUser && <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-[#0039a6] text-white" aria-hidden="true"><Icon name="bagel" size={12} /></span>}
        <div className="min-w-0">
          <p className={`text-[9px] font-bold uppercase tracking-[0.14em] ${isUser ? "text-[#5e6872]" : "text-[#0039a6]"}`}>{isUser ? "You" : "Ock"}</p>
          <p className="mt-1 text-[12px] leading-[1.65] text-[#333a3f]">{message.content}</p>
        </div>
      </div>
    </article>
  );
}
