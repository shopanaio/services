import { createHash } from "node:crypto";

export function adminOrderIdempotencyKey(input: Readonly<Record<string, unknown>>): string {
  const value = input.idempotencyKey;
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("ORDER_IDEMPOTENCYKEY_REQUIRED");
  }
  return value.trim();
}

export function adminOrderRequestDigest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(",")}}`;
}
