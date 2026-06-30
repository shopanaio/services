"use client";

import type {
  ApiPageInfo,
  ApiProduct,
  ApiProductConnection,
  ApiProductOrderByInput,
  ApiProductProductsMetaInput,
  ApiProductWhereInput,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { PRODUCTS_QUERY } from "../graphql";
import type {
  ProductsQueryData,
  ProductsQueryVariables,
} from "../graphql/operation-types";

export interface UseProductsOptions extends RelayCursorPaginationVariables {
  where?: ApiProductWhereInput | null;
  orderBy?: ApiProductOrderByInput[] | null;
  meta?: ApiProductProductsMetaInput | null;
  skip?: boolean;
}

export interface UseProductsReturn {
  products: ApiProduct[];
  connection: ApiProductConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    meta = null,
    skip = false,
  } = options;

  const result = useRelayConnectionQuery<
    ProductsQueryData,
    ProductsQueryVariables,
    ApiProduct,
    ApiProductConnection
  >({
    query: PRODUCTS_QUERY,
    variables: { first, after, last, before, where, orderBy, meta },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.products,
  });

  return {
    products: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
