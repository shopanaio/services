"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiPageInfo,
  ApiProduct,
  ApiProductConnection,
  ApiProductOrderByInput,
  ApiProductProductsMetaInput,
  ApiProductWhereInput,
} from "@/graphql/types";
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

interface UseProductsReturn {
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

  const { data, previousData, loading, error, refetch } = useQuery<
    ProductsQueryData,
    ProductsQueryVariables
  >(PRODUCTS_QUERY, {
    variables: { first, after, last, before, where, orderBy, meta },
    skip,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;
  const connection = effectiveData?.catalogQuery.products ?? null;

  return {
    products: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
