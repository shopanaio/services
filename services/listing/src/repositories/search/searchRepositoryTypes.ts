import type {
  ProductSearchIdentifier,
  ProductSearchText,
  SearchProductBoost,
  SearchProductBoostPhrase,
  SearchProductBoostProduct,
  SearchSynonymGroup,
  SearchSynonymValue,
} from "../models/index.js";

export type SearchTextField = "product_title" | "variant_title" | "vendor_name" | "category_name";

export type SearchIdentifierKind = "SKU";
export type SearchOutOfStockPolicy = "SHOW" | "HIDE" | "PLACE_LAST";

export interface SearchTextElementInput {
  productId: string;
  productDocId: number;
  locale: string;
  field: SearchTextField;
  elementId: string;
  preparedText: string;
  normalizationContractVersion: string;
  normalizationProfileHash: string;
}

export interface SearchIdentifierInput {
  productId: string;
  productDocId: number;
  locale: string;
  elementId: string;
  kind: SearchIdentifierKind;
  normalizedValue: string;
}

export interface SearchTermInput {
  locale: string;
  term: string;
}

export interface SearchSettingsValueInput {
  enabledFields: readonly SearchTextField[];
  fieldWeights: Readonly<Partial<Record<SearchTextField, number>>>;
  typoToleranceEnabled: boolean;
  outOfStockPolicy: SearchOutOfStockPolicy;
}

export interface SearchSynonymValueInput {
  displayValue: string;
  normalizedValue: string;
  preparedText: string;
  normalizationContractVersion: string;
  normalizationProfileHash: string;
}

export interface SearchSynonymGroupAggregate {
  group: SearchSynonymGroup;
  values: SearchSynonymValue[];
}

export interface SearchProductBoostPhraseInput {
  displayPhrase: string;
  normalizedPhrase: string;
  normalizationContractVersion: string;
  normalizationProfileHash: string;
}

export interface SearchProductBoostAggregate {
  boost: SearchProductBoost;
  phrases: SearchProductBoostPhrase[];
  products: SearchProductBoostProduct[];
}

export interface SearchTextCandidate {
  row: ProductSearchText;
}

export interface SearchIdentifierCandidate {
  row: ProductSearchIdentifier;
  priority: 2 | 3;
}

export type SearchMutationResult<T> = { status: "applied"; value: T } | { status: "not_found" };

export function assertNonEmpty(value: string, label: string): void {
  if (value.length === 0) {
    throw new Error(`${label} must not be empty`);
  }
}

export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

export function assertUnique<T>(
  values: readonly T[],
  key: (value: T) => string,
  label: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const current = key(value);
    if (seen.has(current)) {
      throw new Error(`Duplicate ${label}: ${current}`);
    }
    seen.add(current);
  }
}

export function chunk<T>(values: readonly T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
