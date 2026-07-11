export type CanonicalAvailabilityMode = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';

export interface CanonicalVariantTermRecord {
  id: string;
  indexable: boolean;
  available: boolean;
  deliveryReady: 'true' | 'false' | 'unknown';
  optionValues: readonly string[];
  priceMinor: number | null;
}

export interface CanonicalVariantTermProduct {
  id: `P${number}`;
  variants: readonly CanonicalVariantTermRecord[];
}

/**
 * Normative P1-P11 contract dataset for the universal variant-term index.
 * Stable symbolic option values are resolved to real facet/value UUIDs by a
 * concrete API fixture before they are written to the physical index.
 */
export const UNIVERSAL_VARIANT_TERM_PRODUCTS: readonly CanonicalVariantTermProduct[] = [
  product('P1', [variant('P1-A', true, true, 'true', ['color:red'], 100)]),
  product('P2', [variant('P2-A', true, true, 'false', ['color:red'], 110)]),
  product('P3', [variant('P3-A', true, false, 'true', ['color:red'], 120)]),
  product('P4', [variant('P4-A', true, false, 'false', ['color:blue'], 130)]),
  product('P5', [
    variant('P5-A', true, false, 'true', ['color:red'], 100),
    variant('P5-B', true, true, 'false', ['color:blue'], 200),
  ]),
  product('P6', [
    variant('P6-A', true, true, 'true', ['color:red'], 140),
    variant('P6-B', true, false, 'false', ['color:red'], 150),
  ]),
  product('P7', [
    variant('P7-A', true, true, 'true', ['color:green'], null),
    variant('P7-B', true, false, 'true', ['color:green'], 90),
  ]),
  product('P8', [variant('P8-A', false, true, 'true', ['color:red'], 80)]),
  product('P9', []),
  product('P10', [variant('P10-A', true, true, 'unknown', ['color:blue'], 160)]),
  product('P11', [variant('P11-A', true, true, 'true', ['color:blue'], 170)]),
] as const;

export const UNIVERSAL_VARIANT_TERM_EXPECTED = {
  availability: {
    ALL: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11'],
    AVAILABLE: ['P1', 'P2', 'P5', 'P6', 'P7', 'P10', 'P11'],
    UNAVAILABLE: ['P3', 'P4', 'P5', 'P6', 'P7'],
  },
  sameVariant: {
    redAvailableDeliveryReadyPrice100: [],
    redUnavailableDeliveryReadyPrice100: ['P5'],
  },
  selectedZeroCount: {
    selectedOptionValue: 'color:selected-zero',
    expectedCount: 0,
    visible: true,
  },
  monotonicity: {
    andGroupMayOnlyNarrow: true,
    orValueMayExpand: true,
  },
} as const;

function product(
  id: CanonicalVariantTermProduct['id'],
  variants: readonly CanonicalVariantTermRecord[],
): CanonicalVariantTermProduct {
  return { id, variants };
}

function variant(
  id: string,
  indexable: boolean,
  available: boolean,
  deliveryReady: CanonicalVariantTermRecord['deliveryReady'],
  optionValues: readonly string[],
  priceMinor: number | null,
): CanonicalVariantTermRecord {
  return { id, indexable, available, deliveryReady, optionValues, priceMinor };
}
