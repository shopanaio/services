import { createHash } from "node:crypto";
import { canonicalJson } from "@shopana/events";

export function computePayloadHash(payload: unknown): string | null {
  if (payload === undefined) {
    return null;
  }

  const canonical = canonicalJson(payload);
  return createHash("sha256").update(canonical).digest("hex");
}
