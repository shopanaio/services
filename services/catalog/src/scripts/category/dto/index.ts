import type { UserError } from "../../../kernel/BaseScript.js";
import type { Category } from "../../../repositories/models/index.js";

export type ProductSortBy = "manual" | "price" | "newest" | "name";
export type SortDirection = "asc" | "desc";

export interface SeoInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
}

// ============ Create ============

export interface CategoryCreateParams {
  handle: string;
  name: string;
  parentId?: string | null;
  description?: {
    text?: string;
    html?: string;
    json?: Record<string, unknown>;
  };
  seo?: SeoInput;
  mediaFileIds?: string[];
  publish?: boolean;
}

export interface CategoryCreateResult {
  category?: Category;
  userErrors: UserError[];
}

// ============ Update ============

export interface CategoryUpdateParams {
  id: string;
  handle?: string;
  defaultSort?: ProductSortBy;
  defaultSortDirection?: SortDirection;
  name?: string;
  description?: {
    text?: string;
    html?: string;
    json?: Record<string, unknown>;
  } | null;
  seo?: SeoInput | null;
  mediaFileIds?: string[];
}

export interface CategoryUpdateResult {
  category?: Category;
  userErrors: UserError[];
}

// ============ Delete ============

export interface CategoryDeleteParams {
  id: string;
  permanent?: boolean;
}

export interface CategoryDeleteResult {
  deletedCategoryId?: string;
  userErrors: UserError[];
}

// ============ Move ============

export interface CategoryMoveParams {
  id: string;
  newParentId?: string | null;
}

export interface CategoryMoveResult {
  category?: Category;
  userErrors: UserError[];
}

// ============ Listing ============

export interface ProductFiltersInput {
  facets?: string[];
  ranges?: Array<{
    facetSlug: string;
    min?: number;
    max?: number;
  }>;
  priceMinMinor?: number;
  priceMaxMinor?: number;
  inStock?: boolean;
}

export interface ProductSortInput {
  by: ProductSortBy;
  direction?: SortDirection;
}

export interface CategoryProductsQueryParams {
  categoryId: string;
  locale: string;
  first?: number;
  after?: string;
  filters?: ProductFiltersInput;
  sort?: ProductSortInput;
}

export interface CategoryProductsQueryResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
  facets: Record<string, unknown> | null;
}

export interface CategoryMoveProductParams {
  categoryId: string;
  productId: string;
  afterProductId?: string | null;
  beforeProductId?: string | null;
}

export interface CategoryMoveProductResult {
  category?: Category;
  userErrors: UserError[];
}

export interface CategoryRebalanceParams {
  categoryId: string;
}

export interface CategoryRebalanceResult {
  category?: Category;
  userErrors: UserError[];
}

export interface CategoryUpdateSortParams {
  id: string;
  defaultSort: ProductSortBy;
  defaultSortDirection: SortDirection;
}

export interface CategoryUpdateSortResult {
  category?: Category;
  userErrors: UserError[];
}
