import { createHash } from "crypto";
import {
  type DecodedListingCursor,
  type ListingCursorPayload,
  StorefrontRepositoryValidationError,
  type StorefrontFilterPlan,
  type StorefrontListingScope,
  type StorefrontSortInput,
} from "./types.js";

interface FilterHashInput {
  projectId: string;
  locale: string;
  currency: string;
  scope: StorefrontListingScope;
  normalizedQuery: string | null;
  filterPlan: StorefrontFilterPlan;
  sort: StorefrontSortInput;
  manualScopeId?: string | null;
}

export function encodeListingCursor(payload: ListingCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeListingCursor(raw: string): DecodedListingCursor {
  try {
    const decoded = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as ListingCursorPayload;

    if (decoded.version !== 1 || typeof decoded.hash !== "string") {
      throw new StorefrontRepositoryValidationError("Invalid listing cursor");
    }
    if (typeof decoded.productId !== "string" || decoded.productId.length === 0) {
      throw new StorefrontRepositoryValidationError("Invalid listing cursor");
    }

    return { payload: decoded, raw };
  } catch (error) {
    if (error instanceof StorefrontRepositoryValidationError) {
      throw error;
    }
    throw new StorefrontRepositoryValidationError("Invalid listing cursor");
  }
}

export function buildListingFilterHash(input: FilterHashInput): string {
  return createHash("sha256")
    .update(stableStringify(input))
    .digest("base64url")
    .slice(0, 32);
}

export function assertCursorMatches(
  cursor: DecodedListingCursor | null,
  expectedHash: string,
  expectedSort: string
): void {
  if (!cursor) {
    return;
  }
  if (cursor.payload.hash !== expectedHash) {
    throw new StorefrontRepositoryValidationError("Invalid listing cursor hash");
  }
  if (cursor.payload.sort !== expectedSort) {
    throw new StorefrontRepositoryValidationError("Invalid listing cursor sort");
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const item = record[key];
        if (item !== undefined) {
          acc[key] = sortValue(item);
        }
        return acc;
      }, {});
  }
  return value;
}
