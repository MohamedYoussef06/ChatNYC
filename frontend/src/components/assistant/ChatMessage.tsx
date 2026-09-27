import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ConversationMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  action?: { label: string; href: string };
};

export function OckThinkingBubble() {
  return (
    <article className="ock-chat-message border-b border-[#eceeea] pb-3" aria-label="Ock is thinking" role="status">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-[#0039a6] text-white" aria-hidden="true"><Icon name="bagel" size={12} /></span>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#0039a6]">Ock</p>
          <span className="ock-thinking-dots mt-1.5 inline-flex min-h-8 items-center gap-1 rounded-xl bg-[#eef3fb] px-3" aria-hidden="true"><i /><i /><i /></span>
          <span className="sr-only">Ock is thinking.</span>
        </div>
      </div>
    </article>
  );
}

export function ChatMessage({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";

  return (
    <article className="ock-chat-message border-b border-[#eceeea] pb-3 last:border-0" aria-label={isUser ? "Your request" : "Ock response"}>
      <div className="flex items-start gap-2.5">
        {!isUser && <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-[#0039a6] text-white" aria-hidden="true"><Icon name="bagel" size={12} /></span>}
        <div className="min-w-0">
          <p className={`text-[9px] font-bold uppercase tracking-[0.14em] ${isUser ? "text-[#5e6872]" : "text-[#0039a6]"}`}>{isUser ? "You" : "Ock"}</p>
          {isUser ? <p className="mt-1 whitespace-pre-wrap text-[12px] leading-[1.65] text-[#333a3f]">{message.content}</p> : (
            <div className="ock-markdown mt-1 text-[12px] leading-[1.65] text-[#333a3f]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                  a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" className="font-medium text-[#0039a6] underline underline-offset-2" />,
                  h1: ({ ...props }) => <h2 {...props} className="mb-1 mt-3 text-sm font-bold text-[#202428]" />,
                  h2: ({ ...props }) => <h3 {...props} className="mb-1 mt-3 text-[13px] font-bold text-[#202428]" />,
                  h3: ({ ...props }) => <h4 {...props} className="mb-1 mt-2 font-bold text-[#202428]" />,
                  p: ({ ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                  ul: ({ ...props }) => <ul {...props} className="mb-2 ml-4 list-disc space-y-1" />,
                  ol: ({ ...props }) => <ol {...props} className="mb-2 ml-4 list-decimal space-y-1" />,
                  blockquote: ({ ...props }) => <blockquote {...props} className="my-2 border-l-2 border-[#0039a6] pl-3 text-[#596168]" />,
                  code: ({ ...props }) => <code {...props} className="rounded bg-[#eef0ed] px-1 py-0.5 font-mono text-[11px]" />,
                  pre: ({ ...props }) => <pre {...props} className="my-2 overflow-x-auto rounded-lg bg-[#202428] p-3 text-[11px] text-white [&_code]:bg-transparent [&_code]:p-0" />,
                  table: ({ ...props }) => <div className="my-2 overflow-x-auto"><table {...props} className="w-full border-collapse text-left" /></div>,
                  th: ({ ...props }) => <th {...props} className="border-b border-[#cfd4d1] px-2 py-1 font-semibold" />,
                  td: ({ ...props }) => <td {...props} className="border-b border-[#e4e7e3] px-2 py-1" />,
                }}
              >{message.content}</ReactMarkdown>
            </div>
          )}
          {message.action && <Link href={message.action.href} className="mt-2 inline-flex min-h-8 items-center rounded-md bg-[#0039a6] px-3 text-[11px] font-semibold text-white">{message.action.label}</Link>}
        </div>
      </div>
    </article>
  );
}
