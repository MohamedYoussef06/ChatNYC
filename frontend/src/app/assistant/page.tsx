"use client";

import { ChatBox } from "@/components/ChatBox";
import { useWebSocket } from "@/hooks/useWebSocket";

const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export default function AssistantPage() {
  const { messages, connected, send } = useWebSocket(wsUrl);
  return (
    <>
      <h1>Assistant</h1>
      <ChatBox messages={messages} connected={connected} onSend={send} />
    </>
  );
}
