import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import { canonicalizeCommerceFunctionJson } from "@shopana/broker-types";

import { CheckoutPipelineBoundaryError } from "./boundaries.js";
import { CHECKOUT_PIPELINE_MAX_JSON_DEPTH } from "./schemas.js";

export function canonicalJson(value: unknown): string {
  try {
    const validated = canonicalizeCommerceFunctionJson(value, CHECKOUT_PIPELINE_MAX_JSON_DEPTH);
    const result = canonicalize(validated);
    if (result === undefined) {
      throw new TypeError("Canonical JSON serialization returned no value");
    }
    return result;
  } catch {
    throw new CheckoutPipelineBoundaryError("Canonical JSON requires a supported JSON value.");
  }
}

export function canonicalJsonSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function canonicalJsonRevision(value: unknown): string {
  return `sha256:${canonicalJsonSha256(value)}`;
}
