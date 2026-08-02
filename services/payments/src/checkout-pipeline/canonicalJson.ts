import { createHash } from "node:crypto";
import { canonicalizeCommerceFunctionJson } from "@shopana/broker-types";
import canonicalize from "canonicalize";

export function canonicalJson(value: unknown): string {
  const validated = canonicalizeCommerceFunctionJson(value);
  const result = canonicalize(validated);
  if (result === undefined) {
    throw new TypeError("Canonical JSON serialization returned no value");
  }
  return result;
}

export function contentRevision(namespace: string, value: unknown): string {
  return `${namespace}:v1:sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function paymentMethodHandle(value: unknown): string {
  return `pmh_${createHash("sha256").update("payment-method-handle:v1:").update(canonicalJson(value)).digest("base64url")}`;
}
