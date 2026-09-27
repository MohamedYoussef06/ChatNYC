import type { Message, Platform, PlatformInstance, Space } from "spectrum-ts";
import type { imessage } from "spectrum-ts/providers/imessage";

type IMessageDef = typeof imessage extends Platform<infer Def> ? Def : never;
export type IMessageInstance = PlatformInstance<IMessageDef>;

export type SentText = { messageId?: string; fromNumber?: string };

export function maskPhone(phone: string | undefined): string {
  if (!phone) return "unknown";
  return phone.length > 4 ? `***${phone.slice(-4)}` : "***";
}

export async function handleInbound(space: Space, message: Message): Promise<void> {
  if (message.direction === "outbound") return;
  const sender = maskPhone(message.sender?.id);
  if (message.content.type !== "text") {
    console.log(`imessage: ignored ${message.content.type} from ${sender}`);
    return;
  }
  const text = message.content.text.trim();
  console.log(`imessage: inbound from ${sender} (${text.length} chars)`);
  await space.send(`Photon Spectrum is connected. You said: ${text}`);
}

export async function sendText(im: IMessageInstance, phone: string, text: string): Promise<SentText> {
  const user = await im.user(phone);
  const dm = await im.space.create(user);
  const sent = await dm.send(text);
  return { messageId: sent?.id, fromNumber: dm.phone };
}
