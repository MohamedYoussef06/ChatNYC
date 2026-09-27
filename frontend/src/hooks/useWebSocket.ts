"use client";

import { useEffect, useRef, useState } from "react";

export function useWebSocket(url: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      setMessages((current) => [...current, String(event.data)]);
    };
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [url]);

  function send(text: string) {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(text);
    setMessages((current) => [...current, text]);
  }

  return { messages, connected, send };
}
