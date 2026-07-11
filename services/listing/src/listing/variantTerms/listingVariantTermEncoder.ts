import type { ListingVariantTerm } from "./ListingVariantTerm.js";

export const LISTING_VARIANT_TERM_ENCODING_VERSION = "v1" as const;

export function encodeListingVariantTerm(term: ListingVariantTerm): string {
  assertCanonicalTermPart(term.fieldKey, "fieldKey");
  assertCanonicalTermPart(term.valueKey, "valueKey");
  return JSON.stringify([
    LISTING_VARIANT_TERM_ENCODING_VERSION,
    term.fieldKey,
    term.valueKey,
  ]);
}

export function decodeListingVariantTerm(value: string): ListingVariantTerm {
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    throw new Error("Invalid listing variant term encoding");
  }

  if (
    !Array.isArray(decoded) ||
    decoded.length !== 3 ||
    decoded[0] !== LISTING_VARIANT_TERM_ENCODING_VERSION ||
    typeof decoded[1] !== "string" ||
    typeof decoded[2] !== "string"
  ) {
    throw new Error("Unsupported listing variant term encoding");
  }

  assertCanonicalTermPart(decoded[1], "fieldKey");
  assertCanonicalTermPart(decoded[2], "valueKey");
  return Object.freeze({ fieldKey: decoded[1], valueKey: decoded[2] });
}

export function compareTerms(
  left: ListingVariantTerm,
  right: ListingVariantTerm
): number {
  return (
    left.fieldKey.localeCompare(right.fieldKey) ||
    left.valueKey.localeCompare(right.valueKey)
  );
}

export function deduplicateTerms(
  terms: readonly ListingVariantTerm[]
): ListingVariantTerm[] {
  const byEncodedKey = new Map<string, ListingVariantTerm>();
  for (const term of terms) {
    const encoded = encodeListingVariantTerm(term);
    byEncodedKey.set(encoded, Object.freeze({ ...term }));
  }
  return [...byEncodedKey.values()].sort(compareTerms);
}

export function buildListingVariantTermPostingKey(
  term: ListingVariantTerm
): {
  entityType: "variant";
  field: "term";
  valueKey: string;
} {
  return {
    entityType: "variant",
    field: "term",
    valueKey: encodeListingVariantTerm(term),
  };
}

function assertCanonicalTermPart(value: string, label: string): void {
  if (value.length === 0 || value.trim() !== value) {
    throw new Error(`Listing variant term ${label} must be trimmed and non-empty`);
  }
}

