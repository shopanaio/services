import { createHash } from "node:crypto";

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}
export function contentDigest(namespace: string, value: unknown): string {
  return `${namespace}:v1:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}
function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite number");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value !== "object") throw new TypeError("Non-JSON value");
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const child = (value as Record<string, unknown>)[key];
    if (child === undefined) throw new TypeError("Undefined value");
    result[key] = normalize(child);
  }
  return result;
}
