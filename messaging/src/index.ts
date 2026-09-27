import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { ensureSharedUser, getLineType } from "./api/spectrumCloud.js";
import { handleInbound, maskPhone, sendText } from "./handlers/imessage.js";
import { startServer } from "./server.js";

const projectId = process.env.SPECTRUM_PROJECT_ID;
const projectSecret = process.env.SPECTRUM_PROJECT_SECRET;
if (!projectId || !projectSecret) {
  console.error("messaging: set SPECTRUM_PROJECT_ID and SPECTRUM_PROJECT_SECRET in messaging/.env");
  process.exit(1);
}
if (!process.env.MESSAGING_API_KEY) {
  console.warn("messaging: MESSAGING_API_KEY is empty, POST /messages accepts unauthenticated requests");
}

let lineType: Awaited<ReturnType<typeof getLineType>>;
try {
  lineType = await getLineType(projectId, projectSecret);
} catch (error) {
  console.error(`messaging: Spectrum Cloud rejected the project credentials: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

const app = await Spectrum({ projectId, projectSecret, providers: [imessage.config()] });
const im = imessage(app);
console.log(`spectrum: connected to "${app.config.name}" (${lineType} iMessage line)`);

const server = startServer({
  host: process.env.MESSAGING_HOST ?? "127.0.0.1",
  port: Number(process.env.MESSAGING_PORT ?? 8787),
  apiKey: process.env.MESSAGING_API_KEY,
  status: () => ({ project: app.config.name, line: lineType }),
  send: async ({ phone, text }) => {
    const user = lineType === "shared" ? await ensureSharedUser(projectId, projectSecret, phone) : undefined;
    const sent = await sendText(im, phone, text);
    console.log(`imessage: sent ${text.length} chars to ${maskPhone(phone)}`);
    return { messageId: sent.messageId, fromNumber: user?.assignedPhoneNumber ?? sent.fromNumber };
  },
});

async function shutdown(): Promise<void> {
  server.close();
  await app.stop();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

console.log("imessage: waiting for inbound messages");
for await (const [space, message] of app.messages) {
  try {
    await handleInbound(space, message);
  } catch (error) {
    console.error(`imessage: failed to handle message: ${error instanceof Error ? error.message : error}`);
  }
}
