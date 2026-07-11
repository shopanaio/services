import type {
  ListingVariantTerm,
  ListingVariantTermDefinition,
} from "./ListingVariantTerm.js";

export const LISTING_VARIANT_TERM_REGISTRY_VERSION = "2026-07-11.v1";
export const INDEXABLE_TERM_FIELD_KEY = "system.state";
export const INDEXABLE_TERM_VALUE_KEY = "indexable";
export const AVAILABILITY_TERM_FIELD_KEY = "criterion.availability";
export const DELIVERY_READY_TERM_FIELD_KEY = "criterion.delivery.ready";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFINITIONS: readonly ListingVariantTermDefinition[] = Object.freeze([
  {
    fieldKey: INDEXABLE_TERM_FIELD_KEY,
    valueDomain: { kind: "DECLARED", values: [INDEXABLE_TERM_VALUE_KEY] },
    unknownPolicy: "FORBID",
    retainEmpty: true,
  },
  {
    fieldKey: AVAILABILITY_TERM_FIELD_KEY,
    valueDomain: {
      kind: "DECLARED",
      values: ["available", "unavailable"],
    },
    unknownPolicy: "FORBID",
    retainEmpty: true,
    publicFilterKind: "IN_STOCK",
  },
  {
    fieldKey: DELIVERY_READY_TERM_FIELD_KEY,
    valueDomain: {
      kind: "DECLARED",
      values: ["true", "false", "unknown"],
    },
    unknownPolicy: "EXPLICIT",
    retainEmpty: true,
  },
]);

export function getListingVariantTermRegistryDefinitions(): readonly ListingVariantTermDefinition[] {
  return DEFINITIONS;
}

export function getListingVariantTermDefinition(
  fieldKey: string
): ListingVariantTermDefinition | null {
  const declared = DEFINITIONS.find(
    (definition) => definition.fieldKey === fieldKey
  );
  if (declared) {
    return declared;
  }
  if (isOptionFieldKey(fieldKey)) {
    return {
      fieldKey,
      valueDomain: { kind: "CONFIGURED_OPTION_VALUES" },
      unknownPolicy: "FORBID",
      retainEmpty: false,
      publicFilterKind: "OPTION",
    };
  }
  return null;
}

export function assertRegisteredListingVariantTerm(
  term: ListingVariantTerm
): void {
  const definition = getListingVariantTermDefinition(term.fieldKey);
  if (!definition) {
    throw new Error(`Undeclared listing variant term field: ${term.fieldKey}`);
  }

  switch (definition.valueDomain.kind) {
    case "DECLARED":
      if (!definition.valueDomain.values.includes(term.valueKey)) {
        throw new Error(
          `Undeclared listing variant term value: ${term.fieldKey}=${term.valueKey}`
        );
      }
      return;
    case "CONFIGURED_OPTION_VALUES":
      if (!isOptionFieldKey(term.fieldKey) || !isStableId(term.valueKey)) {
        throw new Error(
          `OPTION listing variant term requires stable facet/value ids: ${term.fieldKey}=${term.valueKey}`
        );
      }
      return;
    case "VALIDATED_IDS":
      if (!isStableId(term.valueKey)) {
        throw new Error(
          `Listing variant term requires a validated stable id: ${term.fieldKey}=${term.valueKey}`
        );
      }
  }
}

export function shouldRetainEmptyListingVariantTerm(term: ListingVariantTerm): boolean {
  assertRegisteredListingVariantTerm(term);
  return getListingVariantTermDefinition(term.fieldKey)?.retainEmpty ?? false;
}

export function optionTermFieldKey(facetId: string): string {
  assertStableId(facetId, "facetId");
  return `option:${facetId}`;
}

export function isOptionFieldKey(fieldKey: string): boolean {
  return fieldKey.startsWith("option:") && isStableId(fieldKey.slice("option:".length));
}

export function assertStableId(value: string, label: string): void {
  if (!isStableId(value)) {
    throw new Error(`${label} must be a stable UUID`);
  }
}

function isStableId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

