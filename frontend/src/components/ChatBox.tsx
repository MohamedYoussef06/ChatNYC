"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";

type ChatBoxProps = {
  messages: string[];
  connected: boolean;
  onSend: (text: string) => void;
};

export function ChatBox({ messages, connected, onSend }: ChatBoxProps) {
  const [draft, setDraft] = useState("How do I get to Prospect Park?");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }
    onSend(text);
    setDraft("");
  }

  return (
    <section className="chat">
      <p className="eyebrow">{connected ? "Connected" : "Connecting"}</p>
      <ul>
        {messages.length === 0 ? <li>Send a message to Ock.</li> : null}
        {messages.map((message, index) => (
          <li key={`${index}-${message}`}>{message}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="Message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" disabled={!connected}>
          Send
        </Button>
      </form>
    </section>
  );
}
