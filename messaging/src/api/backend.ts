const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${backendUrl}/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed (${response.status})`);
  }
  return response.json() as Promise<{ status: string }>;
}

export async function sendAssistantMessage(message: string): Promise<{ reply: string }> {
  const response = await fetch(`${backendUrl}/api/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    throw new Error(`Assistant request failed (${response.status})`);
  }
  return response.json() as Promise<{ reply: string }>;
}
