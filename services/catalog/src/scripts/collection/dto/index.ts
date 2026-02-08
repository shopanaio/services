import type { UserError } from "../../../kernel/BaseScript.js";
import type { Collection } from "../../../repositories/models/index.js";
import type {
  ProductFiltersInput,
  ProductSortBy,
  ProductSortInput,
  SeoInput,
  SortDirection,
} from "../../category/dto/index.js";

export type {
  ProductFiltersInput,
  ProductSortBy,
  ProductSortInput,
  SeoInput,
  SortDirection,
} from "../../category/dto/index.js";

export interface CollectionDescriptionInput {
  text?: string;
  html?: string;
  json?: Record<string, unknown>;
}

export interface CollectionRuleInput {
  field: string;
  operator: string;
  value: unknown;
}

export interface CollectionCreateParams {
  handle?: string | null;
  type: "manual" | "rule";
  name: string;
  description?: CollectionDescriptionInput;
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
  description?: CollectionDescriptionInput | null;
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

export interface CollectionUpdateRulesParams {
  collectionId: string;
  rules: CollectionRuleInput[];
}

export interface CollectionProductsQueryParams {
  collectionId: string;
  locale: string;
  first?: number;
  after?: string;
  filters?: ProductFiltersInput;
  sort?: ProductSortInput;
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
  facets: Record<string, unknown> | null;
}

export interface CollectionResult {
  collection?: Collection;
  userErrors: UserError[];
}

export interface CollectionDeleteResult {
  deletedCollectionId?: string;
  userErrors: UserError[];
}
