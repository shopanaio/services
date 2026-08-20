import type { UserError } from "../../../kernel/BaseScript.js";
import type { Collection } from "../../../repositories/models/index.js";
import type { CanonicalCollectionRule } from "@shopana/broker-types";
import type { ProductSortBy, ProductSortInput, SeoInput } from "../../category/dto/index.js";
import type { RichTextInput } from "../../shared/richText.js";

export type {
  ProductSortBy,
  ProductSortInput,
  SeoInput,
  SortDirection,
} from "../../category/dto/index.js";

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
  expectedRevision: number;
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
  expectedRevision: number;
}

export interface CollectionAddProductsParams {
  collectionId: string;
  productIds: string[];
  expectedRevision: number;
}

export interface CollectionRemoveProductsParams {
  collectionId: string;
  productIds: string[];
  expectedRevision: number;
}

export interface CollectionMoveProductParams {
  collectionId: string;
  productId: string;
  expectedRevision: number;
  afterProductId?: string | null;
  beforeProductId?: string | null;
}

export interface CollectionRebalanceParams {
  collectionId: string;
  expectedRevision: number;
}

export interface CollectionClearProductsParams {
  collectionId: string;
  expectedRevision: number;
}

export interface CollectionUpdateRulesParams {
  collectionId: string;
  expectedRevision: number;
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
  revision?: number;
  listingRevision?: number;
  deletedAt?: string;
  syncOperationId?: string;
  userErrors: UserError[];
}
