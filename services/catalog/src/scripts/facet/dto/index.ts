import type { UserError } from "../../../kernel/BaseScript.js";
import type {
  Facet,
  FacetGroup,
  FacetValue,
  FacetSwatch,
} from "../../../repositories/models/index.js";

export interface FacetGroupCreateParams {
  name: string;
  collapsed?: boolean;
  sortIndex?: number;
}

export interface FacetGroupUpdateParams {
  id: string;
  name?: string;
  collapsed?: boolean;
  sortIndex?: number;
}

export interface FacetGroupDeleteParams {
  id: string;
}

export interface FacetCreateParams {
  facetType: string;
  slug: string;
  label: string;
  uiType?: string;
  selectionMode?: string;
  groupId?: string | null;
  sortIndex?: number;
}

export interface FacetUpdateParams {
  id: string;
  slug?: string;
  label?: string;
  uiType?: string;
  selectionMode?: string;
  groupId?: string | null;
  sortIndex?: number;
  minValues?: number;
  maxValuesVisible?: number;
  valueSort?: string;
  indexable?: boolean;
}

export interface FacetDeleteParams {
  id: string;
}

export interface FacetValueCreateParams {
  facetId: string;
  slug: string;
  label: string;
  sourceHandles?: string[];
  swatchId?: string | null;
  sortIndex?: number;
  enabled?: boolean;
}

export interface FacetValueUpdateParams {
  id: string;
  slug?: string;
  label?: string;
  sourceHandles?: string[];
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
  valueSlug: string;
  facetId: string;
  facetType: string;
  sourceHandles: string[];
}

export interface ResolveFacetsResult {
  tagHandles: string[];
  featureSlugs: string[];
  optionSlugs: string[];
  resolved: ResolvedFacetFilter[];
}

export interface FacetGroupResult {
  facetGroup?: FacetGroup;
  userErrors: UserError[];
}

export interface FacetGroupDeleteResult {
  deletedFacetGroupId?: string;
  userErrors: UserError[];
}

export interface FacetResult {
  facet?: Facet;
  userErrors: UserError[];
}

export interface FacetDeleteResult {
  deletedFacetId?: string;
  userErrors: UserError[];
}

export interface FacetValueResult {
  facetValue?: FacetValue;
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
