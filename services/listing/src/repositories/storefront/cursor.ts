import { createHash } from "crypto";
import {
  type DecodedListingCursor,
  type ListingCursorPayload,
  type NormalizedStorefrontListingFilters,
  StorefrontRepositoryValidationError,
  type StorefrontListingScope,
  type StorefrontSortInput,
} from "./types.js";
import type { ListingVariantTermGroup } from "../../listing/variantTerms/index.js";
import type { SearchExecutionMode } from "../../search/execution/index.js";

const POSTGRES_INT4_MAX = 2_147_483_647;
const POSTGRES_INT8_MAX = 9_223_372_036_854_775_807n;

interface FilterHashInput {
  storeId: string;
  locale: string;
  currency: string;
  scope: StorefrontListingScope;
  normalizedQuery: string | null;
  searchMode?: SearchExecutionMode | null;
  filters: NormalizedStorefrontListingFilters;
  sort: StorefrontSortInput;
  manualScopeId?: string | null;
  variantTermGroups?: readonly ListingVariantTermGroup[];
}

export function encodeListingCursor(payload: ListingCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeListingCursor(raw: string): DecodedListingCursor {
  try {
    const decoded = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as ListingCursorPayload;

    if (
      decoded.version !== 4 ||
      typeof decoded.hash !== "string" ||
      !/^[A-Za-z0-9_-]{32}$/u.test(decoded.hash)
    ) {
      throw new StorefrontRepositoryValidationError("Invalid listing cursor");
    }
    if (!isStorefrontSortKind(decoded.sort)) {
      throw new StorefrontRepositoryValidationError("Invalid listing cursor");
    }
    if (decoded.mode !== null && decoded.mode !== "PRIMARY" && decoded.mode !== "FUZZY") {
      throw new StorefrontRepositoryValidationError("Invalid listing cursor");
    }
    if (
      typeof decoded.issuedAt !== "string" ||
      !isCanonicalIsoTimestamp(decoded.issuedAt) ||
      typeof decoded.availabilityBucket !== "boolean"
    ) {
      throw new StorefrontRepositoryValidationError("Invalid listing cursor");
    }
    if (
      typeof decoded.productId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        decoded.productId,
      )
    ) {
      throw new StorefrontRepositoryValidationError("Invalid listing cursor");
    }
    assertSortTuple(decoded);

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
    .update(
      stableStringify({
        ...input,
        scope: canonicalScopeHashInput(input.scope),
      }),
    )
    .digest("base64url")
    .slice(0, 32);
}

function canonicalScopeHashInput(scope: StorefrontListingScope): unknown {
  if (scope.kind !== "collection") return scope;
  return {
    kind: scope.kind,
    collectionId: scope.collectionId,
    rulesHash: scope.rulesHash,
  };
}

export function assertCursorMatches(
  cursor: DecodedListingCursor | null,
  expectedHash: string,
  expectedSort: string,
  expectedMode: SearchExecutionMode | null,
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
  if (cursor.payload.mode !== expectedMode) {
    throw new StorefrontRepositoryValidationError("Invalid listing cursor mode");
  }
}

export function encodeCursorFloat64(value: number): string {
  if (!Number.isFinite(value)) {
    throw new StorefrontRepositoryValidationError("Listing cursor cannot encode a non-finite rank");
  }
  const bytes = Buffer.allocUnsafe(8);
  bytes.writeDoubleBE(value);
  return bytes.toString("base64url");
}

export function decodeCursorFloat64(value: string): number {
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length !== 8 || bytes.toString("base64url") !== value) {
      throw new Error("invalid float encoding");
    }
    const decoded = bytes.readDoubleBE();
    if (!Number.isFinite(decoded)) throw new Error("non-finite float");
    return decoded;
  } catch {
    throw new StorefrontRepositoryValidationError("Invalid listing cursor rank");
  }
}

function assertSortTuple(payload: ListingCursorPayload): void {
  switch (payload.sort) {
    case "manual":
    case "name_asc":
    case "name_desc":
      assertNullableString(payload.textValue, "textValue");
      return;
    case "newest":
      assertNullableTimestamp(payload.publishedAt, "publishedAt");
      assertNullableTimestamp(payload.productCreatedAt, "productCreatedAt");
      return;
    case "created":
      assertTimestamp(payload.productCreatedAt, "productCreatedAt");
      return;
    case "price_asc":
    case "price_desc":
      assertNullableBigint(payload.priceMinor, "priceMinor");
      if (
        payload.variantDocId !== null &&
        payload.variantDocId !== undefined &&
        (!Number.isSafeInteger(payload.variantDocId) ||
          payload.variantDocId <= 0 ||
          payload.variantDocId > POSTGRES_INT4_MAX)
      ) {
        throw new StorefrontRepositoryValidationError("Invalid listing cursor variantDocId");
      }
      return;
    case "relevance":
      if (typeof payload.relevanceScoreBits !== "string" || typeof payload.boosted !== "boolean") {
        throw new StorefrontRepositoryValidationError("Invalid listing cursor relevance tuple");
      }
      decodeCursorFloat64(payload.relevanceScoreBits);
      if (payload.mode === "FUZZY") {
        if (
          !Number.isInteger(payload.totalEditDistance) ||
          payload.totalEditDistance! < 0 ||
          payload.totalEditDistance! > 8 ||
          typeof payload.minimumTrigramSimilarityBits !== "string"
        ) {
          throw new StorefrontRepositoryValidationError(
            "Invalid listing cursor fuzzy relevance tuple",
          );
        }
        const similarity = decodeCursorFloat64(payload.minimumTrigramSimilarityBits);
        if (similarity < 0 || similarity > 1) {
          throw new StorefrontRepositoryValidationError("Invalid listing cursor fuzzy similarity");
        }
      } else if (
        !Number.isInteger(payload.identifierPriority) ||
        (payload.identifierPriority !== 1 &&
          payload.identifierPriority !== 2 &&
          payload.identifierPriority !== 3)
      ) {
        throw new StorefrontRepositoryValidationError(
          "Invalid listing cursor primary relevance tuple",
        );
      }
      return;
  }
}

function assertNullableString(value: unknown, label: string): void {
  if (value !== null && typeof value !== "string") {
    throw new StorefrontRepositoryValidationError(`Invalid listing cursor ${label}`);
  }
}

function assertNullableBigint(value: unknown, label: string): void {
  if (value === null) {
    return;
  }
  if (typeof value !== "string" || !/^\d{1,19}$/u.test(value)) {
    throw new StorefrontRepositoryValidationError(`Invalid listing cursor ${label}`);
  }
  try {
    if (BigInt(value) > POSTGRES_INT8_MAX) {
      throw new StorefrontRepositoryValidationError(`Invalid listing cursor ${label}`);
    }
  } catch (error) {
    if (error instanceof StorefrontRepositoryValidationError) {
      throw error;
    }
    throw new StorefrontRepositoryValidationError(`Invalid listing cursor ${label}`);
  }
}

function assertNullableTimestamp(value: unknown, label: string): void {
  if (value !== null && (typeof value !== "string" || !isIsoTimestamp(value))) {
    throw new StorefrontRepositoryValidationError(`Invalid listing cursor ${label}`);
  }
}

function assertTimestamp(value: unknown, label: string): void {
  if (typeof value !== "string" || !isIsoTimestamp(value)) {
    throw new StorefrontRepositoryValidationError(`Invalid listing cursor ${label}`);
  }
}

function isCanonicalIsoTimestamp(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

function isStorefrontSortKind(value: unknown): value is ListingCursorPayload["sort"] {
  return (
    value === "manual" ||
    value === "newest" ||
    value === "created" ||
    value === "name_asc" ||
    value === "name_desc" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "relevance"
  );
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
