const E164 = /^\+[1-9]\d{6,14}$/;

export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (E164.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
