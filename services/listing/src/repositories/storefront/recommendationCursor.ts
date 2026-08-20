import { sha256Canonical } from "../../recommendation/canonical.js";
import { STOREFRONT_ELIGIBILITY_POLICY_VERSION } from "../../recommendation/constants.js";
import type { RecommendationPlacement } from "../models/recommendationRuntime.js";

export interface RecommendationCursorPayload {
  version: 1;
  hash: string;
  snapshotId: string;
  rank: number;
}

export function recommendationCursorHash(input: {
  storeId: string;
  anchorProductId: string;
  placement: RecommendationPlacement;
  snapshotId: string;
}): string {
  return sha256Canonical({
    ...input,
    eligibilityPolicyVersion: STOREFRONT_ELIGIBILITY_POLICY_VERSION,
  });
}

export function encodeRecommendationCursor(payload: RecommendationCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeRecommendationCursor(value: string): RecommendationCursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<RecommendationCursorPayload>;
    if (
      parsed.version !== 1 || typeof parsed.hash !== "string" ||
      typeof parsed.snapshotId !== "string" || !Number.isSafeInteger(parsed.rank) ||
      (parsed.rank ?? 0) < 1
    ) throw new Error("shape");
    return parsed as RecommendationCursorPayload;
  } catch {
    throw new StorefrontRecommendationValidationError("Invalid recommendation cursor");
  }
}

export class StorefrontRecommendationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorefrontRecommendationValidationError";
  }
}
