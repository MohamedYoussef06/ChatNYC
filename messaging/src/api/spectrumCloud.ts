const cloudUrl = process.env.SPECTRUM_CLOUD_URL ?? "https://spectrum.photon.codes";

export type LineType = "shared" | "dedicated";

export type SpectrumUser = {
  id: string;
  phoneNumber: string;
  assignedPhoneNumber: string;
};

export class SpectrumCloudRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Envelope<T> = { succeed: true; data: T } | { succeed: false; error?: { message?: string } };

async function request<T>(projectId: string, projectSecret: string, path: string, init: RequestInit = {}): Promise<T> {
  const auth = Buffer.from(`${projectId}:${projectSecret}`).toString("base64");
  const response = await fetch(`${cloudUrl}/projects/${projectId}${path}`, {
    ...init,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = (await response.json().catch(() => undefined)) as Envelope<T> | undefined;
  if (!response.ok || !body?.succeed) {
    const detail = body && !body.succeed ? body.error?.message : undefined;
    throw new SpectrumCloudRequestError(response.status, detail ?? `Spectrum Cloud ${path} failed (${response.status})`);
  }
  return body.data;
}

export async function getLineType(projectId: string, projectSecret: string): Promise<LineType> {
  const data = await request<{ type: LineType }>(projectId, projectSecret, "/imessage/");
  return data.type;
}

// Free/Pro projects only deliver to registered users. Idempotent on phoneNumber.
export async function ensureSharedUser(projectId: string, projectSecret: string, phoneNumber: string): Promise<SpectrumUser> {
  return request<SpectrumUser>(projectId, projectSecret, "/users/", {
    method: "POST",
    body: JSON.stringify({ type: "shared", phoneNumber }),
  });
}
