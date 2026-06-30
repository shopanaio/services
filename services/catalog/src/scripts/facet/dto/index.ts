import type { UserError } from "../../../kernel/BaseScript.js";
import type {
  Facet,
  FacetValue,
  FacetSwatch,
} from "../../../repositories/models/index.js";

export interface FacetCreateSourceInput {
  handle: string;
  name: string;
}

export interface FacetCreateValueCandidateInput {
  handle: string;
  label: string;
  sourceHandle: string;
}

export interface FacetCreateParams {
  facetType: string;
  slug: string;
  label: string;
  uiType?: string;
  selectionMode?: string;
  lexoRank?: string;
  sources?: FacetCreateSourceInput[];
  valueCandidates?: FacetCreateValueCandidateInput[];
}

export interface FacetUpdateParams {
  id: string;
  slug?: string;
  label?: string;
  uiType?: string;
  selectionMode?: string;
  lexoRank?: string;
}

export interface FacetDeleteParams {
  id: string;
}

export interface FacetMoveParams {
  id: string;
  afterFacetId?: string | null;
  beforeFacetId?: string | null;
}

export interface FacetRebalanceParams {}

export type FacetValueKind = "source" | "display";

export interface FacetValueCreateParams {
  facetId: string;
  kind: FacetValueKind;
  handle: string;
  label: string;
  sourceValueIds?: string[];
  swatchId?: string | null;
  sortIndex?: number;
  enabled?: boolean;
}

export interface FacetValueUpdateParams {
  id: string;
  handle?: string;
  label?: string;
  swatchId?: string | null;
  sortIndex?: number;
  enabled?: boolean;
}

export interface FacetValueDeleteParams {
  id: string;
}

export interface FacetSwatchCreateParams {
  swatchType: string;
  colorOne?: string | null;
  colorTwo?: string | null;
  fileId?: string | null;
  metadata?: unknown;
}

export interface FacetSwatchUpdateParams {
  id: string;
  swatchType?: string;
  colorOne?: string | null;
  colorTwo?: string | null;
  fileId?: string | null;
  metadata?: unknown;
}

export interface FacetSwatchDeleteParams {
  id: string;
}

export interface ResolveFacetsParams {
  facetFilters: string[];
}

export interface ResolvedFacetFilter {
  facetSlug: string;
  valueHandle: string;
  facetId: string;
  facetType: string;
  resolvedSourceHandles: string[];
}

export interface ResolveFacetsResult {
  tagHandles: string[];
  featureSlugs: string[];
  optionSlugs: string[];
  resolved: ResolvedFacetFilter[];
}

export interface FacetResult {
  facet?: Facet;
  userErrors: UserError[];
}

export interface FacetDeleteResult {
  deletedFacetId?: string;
  userErrors: UserError[];
}

export interface FacetRebalanceResult {
  facets: Facet[];
  userErrors: UserError[];
}

export interface FacetValueResult {
  facetValue?: FacetValue;
  userErrors: UserError[];
}

export interface FacetValueMergeParams {
  facetId: string;
  targetDisplayValueId?: string;
  targetHandle?: string;
  targetLabel?: string;
  sourceValueIds: string[];
}

export type FacetValueEmptyDisplayAction = "disable" | "delete" | "keep";

export interface FacetValueUnmergeParams {
  sourceValueIds: string[];
  emptyDisplayAction?: FacetValueEmptyDisplayAction;
}

export interface FacetValueMergeResult {
  facetValue?: FacetValue;
  sourceValues: FacetValue[];
  userErrors: UserError[];
}

export interface FacetValueUnmergeResult {
  sourceValues: FacetValue[];
  affectedDisplayValues: FacetValue[];
  userErrors: UserError[];
}

export interface FacetValueDeleteResult {
  deletedFacetValueId?: string;
  userErrors: UserError[];
}

export interface FacetSwatchResult {
  facetSwatch?: FacetSwatch;
  userErrors: UserError[];
}

export interface FacetSwatchDeleteResult {
  deletedFacetSwatchId?: string;
  userErrors: UserError[];
}
