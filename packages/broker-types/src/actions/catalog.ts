/**
 * Catalog service broker action types.
 */

export interface CatalogQueryParams {
  storeId: string;
  selection: CatalogQuerySelection;
}

export type CatalogQueryResult =
  | {
      ok: true;
      data: CatalogQueryData;
    }
  | {
      ok: false;
      code: CatalogQueryErrorCode;
      message: string;
      retryable: boolean;
    };

export type CatalogQueryErrorCode =
  | "INVALID_CATALOG_PRODUCT_READ_INPUT"
  | "CATALOG_STORE_NOT_FOUND"
  | "CATALOG_PRODUCT_READ_QUERY_FAILED";

export interface CatalogQuerySelection {
  fields?: never;
  populate?: CatalogQueryPopulate;
  args?: never;
  fieldName?: never;
}

export interface CatalogQueryPopulate {
  products?: ProductConnectionSelection;
}

export interface ProductConnectionSelection {
  args?: CatalogQueryProductsArgs;
  fields?: ProductConnectionField[];
  populate?: ProductConnectionPopulate;
  fieldName?: "products";
}

export type ProductConnectionField = "totalCount";

export interface ProductConnectionPopulate {
  edges?: ProductEdgeSelection;
  pageInfo?: PageInfoSelection;
}

export interface CatalogQueryData {
  products?: ProductConnection;
}

export type CatalogQueryProductsArgs = RelayConnectionArgs & {
  where?: ProductWhereInput | null;
};

export interface ProductEdgeSelection {
  fields?: ProductEdgeField[];
  populate?: ProductEdgePopulate;
  args?: never;
  fieldName?: "edges";
}

export type ProductEdgeField = "cursor";

export interface ProductEdgePopulate {
  node?: ProductSnapshotSelection;
}

export interface ProductSnapshotSelection {
  fields?: ProductSnapshotField[];
  populate?: never;
  args?: never;
  fieldName?: never;
}

export type ProductSnapshotField = "id";

export interface ProductWhereInput {
  id?: IdFilter | null;
}

export interface IdFilter {
  _eq?: string | null;
  _neq?: string | null;
  _in?: string[] | null;
  _notIn?: string[] | null;
  _is?: boolean | null;
  _isNot?: boolean | null;
}

export interface RelayConnectionArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface PageInfoSelection {
  fields?: PageInfoField[];
  populate?: never;
  args?: never;
  fieldName?: "pageInfo";
}

export type PageInfoField =
  | "hasNextPage"
  | "hasPreviousPage"
  | "startCursor"
  | "endCursor";

export interface ProductConnection {
  edges?: ProductEdge[];
  pageInfo?: PageInfo;
  totalCount?: number;
}

export interface ProductEdge {
  node?: ProductSnapshot;
  cursor?: string;
}

export interface ProductSnapshot {
  id?: string;
}

export interface PageInfo {
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  startCursor?: string | null;
  endCursor?: string | null;
}
