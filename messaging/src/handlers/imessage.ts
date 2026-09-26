export function toAssistantRequest(text: string): { message: string } {
  return { message: text.trim() };
}
