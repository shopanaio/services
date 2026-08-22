import type { UserError } from "../../../kernel/BaseScript.js";
import type { Collection } from "../../../repositories/models/index.js";
import type { CanonicalCollectionRule } from "@shopana/broker-types";
export type ProductSortBy = "manual" | "price" | "newest" | "name";
export type SortDirection = "asc" | "desc";
export interface ProductSortInput {
  by: ProductSortBy;
  direction?: SortDirection;
}
export interface SeoInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
}
import type { RichTextInput } from "../../../scripts/shared/richText.js";

export type CollectionRuleInput = CanonicalCollectionRule;

export interface CollectionCreateParams {
  handle?: string | null;
  type: "manual" | "rule";
  name: string;
  description?: RichTextInput | null;
  excerpt?: RichTextInput | null;
  mediaFileIds?: string[];
  seo?: SeoInput;
  defaultSort?: ProductSortBy;
  defaultSortDirection?: "asc" | "desc";
  activeFrom?: string | null;
  activeTo?: string | null;
  publish?: boolean;
}

export interface CollectionUpdateParams {
  id: string;
  handle?: string | null;
  name?: string;
  description?: RichTextInput | null;
  excerpt?: RichTextInput | null;
  mediaFileIds?: string[];
  seo?: SeoInput | null;
  defaultSort?: ProductSortBy;
  defaultSortDirection?: "asc" | "desc";
  activeFrom?: string | null;
  activeTo?: string | null;
  publish?: boolean;
}

export interface CollectionDeleteParams {
  id: string;
}

export interface CollectionAddProductsParams {
  collectionId: string;
  productIds: string[];
}

export interface CollectionRemoveProductsParams {
  collectionId: string;
  productIds: string[];
}

export interface CollectionMoveProductParams {
  collectionId: string;
  productId: string;
  afterProductId?: string | null;
  beforeProductId?: string | null;
}

export interface CollectionRebalanceParams {
  collectionId: string;
}

export interface CollectionClearProductsParams {
  collectionId: string;
}

export interface CollectionUpdateRulesParams {
  collectionId: string;
  rules: CanonicalCollectionRule[];
}

export interface CollectionProductsQueryParams {
  collectionId: string;
  locale: string;
  first?: number;
  after?: string;
  sort?: ProductSortInput;
  /** Skip publish check (for admin API which allows querying unpublished collections) */
  skipPublishCheck?: boolean;
  /** Include draft products (for admin API) */
  includeDrafts?: boolean;
}

export interface CollectionProductsQueryResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

export interface CollectionResult {
  collection?: Collection;
  syncOperationId?: string;
  userErrors: UserError[];
}

export interface CollectionDeleteResult {
  deletedCollectionId?: string;
  deletedAt?: string;
  syncOperationId?: string;
  userErrors: UserError[];
}
