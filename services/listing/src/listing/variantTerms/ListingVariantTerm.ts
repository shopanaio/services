export interface ListingVariantTerm {
  readonly fieldKey: string;
  readonly valueKey: string;
}

export type ListingVariantTermGroupSource =
  | "OPTION"
  | "AVAILABILITY"
  | "CRITERION";

export interface ListingVariantTermGroup {
  readonly groupKey: string;
  readonly terms: readonly ListingVariantTerm[];
  readonly source: ListingVariantTermGroupSource;
}

export type ListingVariantTermValueDomain =
  | { readonly kind: "DECLARED"; readonly values: readonly string[] }
  | { readonly kind: "CONFIGURED_OPTION_VALUES" }
  | { readonly kind: "VALIDATED_IDS" };

export type ListingVariantTermUnknownPolicy = "FORBID" | "EXPLICIT" | "OMIT";

export interface ListingVariantTermDefinition {
  readonly fieldKey: string;
  readonly valueDomain: ListingVariantTermValueDomain;
  readonly unknownPolicy: ListingVariantTermUnknownPolicy;
  readonly retainEmpty: boolean;
  readonly publicFilterKind?: string;
}

