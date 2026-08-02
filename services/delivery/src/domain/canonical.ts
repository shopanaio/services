import { createHash, createHmac } from "node:crypto";

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sort(value));
}

function sort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sort);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sort(child)]));
  return value;
}

export function revision(prefix: string, value: unknown): string {
  return `${prefix}_${createHash("sha256").update(canonicalJson(value)).digest("base64url")}`;
}

export function optionHandle(secret: string, value: unknown): string {
  return `dopt_v1_${createHmac("sha256", secret).update(canonicalJson(value)).digest("base64url")}`;
}
