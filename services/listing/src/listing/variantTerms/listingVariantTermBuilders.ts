import type {
  ListingVariantTerm,
  ListingVariantTermGroup,
  ListingVariantTermGroupSource,
} from "./ListingVariantTerm.js";
import { deduplicateTerms } from "./listingVariantTermEncoder.js";
import {
  assertRegisteredListingVariantTerm,
  AVAILABILITY_TERM_FIELD_KEY,
  INDEXABLE_TERM_FIELD_KEY,
  INDEXABLE_TERM_VALUE_KEY,
  optionTermFieldKey,
} from "./listingVariantTermRegistry.js";

export function createListingVariantTerm(
  fieldKey: string,
  valueKey: string
): ListingVariantTerm {
  const term = Object.freeze({ fieldKey, valueKey });
  assertRegisteredListingVariantTerm(term);
  return term;
}

export function buildIndexableVariantTerm(): ListingVariantTerm {
  return createListingVariantTerm(
    INDEXABLE_TERM_FIELD_KEY,
    INDEXABLE_TERM_VALUE_KEY
  );
}

export function buildAvailabilityVariantTerm(
  availableForSale: boolean
): ListingVariantTerm {
  return createListingVariantTerm(
    AVAILABILITY_TERM_FIELD_KEY,
    availableForSale ? "available" : "unavailable"
  );
}

export function buildOptionVariantTerm(input: {
  facetId: string;
  facetValueId: string;
}): ListingVariantTerm {
  return createListingVariantTerm(
    optionTermFieldKey(input.facetId),
    input.facetValueId
  );
}

export function materializeListingVariantTerms(input: {
  availableForSale: boolean;
  options: readonly { facetId: string; facetValueId: string }[];
  criteria?: readonly ListingVariantTerm[];
}): ListingVariantTerm[] {
  return deduplicateTerms([
    buildIndexableVariantTerm(),
    buildAvailabilityVariantTerm(input.availableForSale),
    ...input.options.map(buildOptionVariantTerm),
    ...(input.criteria ?? []),
  ]);
}

export function buildListingVariantTermGroup(input: {
  groupKey: string;
  terms: readonly ListingVariantTerm[];
  source: ListingVariantTermGroupSource;
}): ListingVariantTermGroup {
  if (!input.groupKey || input.groupKey.trim() !== input.groupKey) {
    throw new Error("Listing variant term groupKey must be trimmed and non-empty");
  }
  return Object.freeze({
    groupKey: input.groupKey,
    terms: Object.freeze(deduplicateTerms(input.terms)),
    source: input.source,
  });
}

export function buildAvailabilityVariantTermGroup(
  available: boolean
): ListingVariantTermGroup {
  return buildListingVariantTermGroup({
    groupKey: AVAILABILITY_TERM_FIELD_KEY,
    terms: [buildAvailabilityVariantTerm(available)],
    source: "AVAILABILITY",
  });
}

