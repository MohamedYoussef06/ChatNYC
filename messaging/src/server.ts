import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export type SendRequest = { phone: string; text: string };

type ServerOptions = {
  host: string;
  port: number;
  apiKey?: string;
  send: (request: SendRequest) => Promise<Record<string, unknown>>;
  status: () => Record<string, unknown>;
};

const E164 = /^\+[1-9]\d{6,14}$/;
const MAX_BODY_BYTES = 64 * 1024;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function startServer(options: ServerOptions): Server {
  const server = createServer((req, res) => {
    route(req, res, options).catch((error: unknown) => {
      const status = error instanceof HttpError ? error.status : 502;
      const detail = error instanceof Error ? error.message : "Send failed";
      if (status >= 500) console.error(`messaging: ${req.method} ${req.url} failed: ${detail}`);
      if (!res.headersSent) json(res, status, { detail });
    });
  });
  server.listen(options.port, options.host, () => {
    console.log(`messaging: listening on http://${options.host}:${options.port}`);
  });
  return server;
}

async function route(req: IncomingMessage, res: ServerResponse, options: ServerOptions): Promise<void> {
  if (req.method === "GET" && req.url === "/health") {
    json(res, 200, { status: "ok", ...options.status() });
    return;
  }
  if (req.method === "POST" && req.url === "/messages") {
    if (!authorized(req, options.apiKey)) throw new HttpError(401, "Unauthorized");
    const body = await readJson(req);
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!E164.test(phone)) throw new HttpError(422, "phone must be E.164, like +14155551234");
    if (!text) throw new HttpError(422, "text is required");
    json(res, 200, { status: "sent", ...(await options.send({ phone, text })) });
    return;
  }
  throw new HttpError(404, "Not found");
}

function authorized(req: IncomingMessage, apiKey: string | undefined): boolean {
  if (!apiKey) return true;
  const given = Buffer.from(req.headers.authorization ?? "");
  const expected = Buffer.from(`Bearer ${apiKey}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Body too large");
    chunks.push(chunk as Buffer);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Body must be a JSON object");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "Body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
