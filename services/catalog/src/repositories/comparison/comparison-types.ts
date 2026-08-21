export type ComparisonValueType = "BOOLEAN" | "DECIMAL" | "ENUM" | "INTEGER" | "TEXT";
export type ComparisonCardinality = "SINGLE" | "MULTIPLE";

export interface LocalizedComparisonProfile {
  id: string;
  storeId: string;
  handle: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  name: string;
  missingLabel: string;
  notApplicableLabel: string;
  unavailableLabel: string;
}

export interface ComparisonNormalizedValueInput {
  booleanValue?: boolean | null;
  decimalValue?: string | null;
  integerValue?: bigint | string | null;
  textValue?: string | null;
  fieldOptionId?: string | null;
}

export interface ComparisonFieldAggregateInput {
  id: string;
  handle: string;
  name: string;
  description?: string | null;
  valueType: ComparisonValueType;
  cardinality: ComparisonCardinality;
  canonicalUnit?: string | null;
  sortIndex: number;
  featured: boolean;
  options: Array<{
    id: string;
    handle: string;
    name: string;
    sortIndex: number;
  }>;
}

export interface ComparisonGroupAggregateInput {
  id: string;
  handle: string;
  name: string;
  sortIndex: number;
  fields: ComparisonFieldAggregateInput[];
}

export interface ComparisonProfileAggregateInput {
  id: string;
  handle: string;
  enabled: boolean;
  name: string;
  missingLabel: string;
  notApplicableLabel: string;
  unavailableLabel: string;
  locale: string;
  groups: ComparisonGroupAggregateInput[];
}

export interface EffectiveComparisonProfileRow extends Record<string, unknown> {
  ownerId: string;
  categoryId: string;
  profileId: string | null;
  enabled: boolean | null;
}

export interface ComparisonConfigurationRows {
  featureBindings: Array<Record<string, unknown>>;
  featureValues: Array<Record<string, unknown>>;
  optionBindings: Array<Record<string, unknown>>;
  optionValues: Array<Record<string, unknown>>;
  notApplicable: Array<Record<string, unknown>>;
}

export interface ComparisonCandidate {
  productId: string;
  variantId: string;
  categoryId: string;
  lexoRank: string;
  isDefault: boolean;
  variantCreatedAt: string;
}
