"use client";

import type {
  ApiPageInfo,
  ApiVariant,
  ApiVariantConnection,
  ApiVariantOrderByInput,
  ApiVariantWhereInput,
  ApiWarehouseAssignableVariantOrderByInput,
  ApiWarehouseAssignableVariantWhereInput,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { VARIANTS_QUERY, WAREHOUSE_ASSIGNABLE_VARIANTS_QUERY } from "../graphql";
import type {
  VariantsQueryData,
  VariantsQueryVariables,
  WarehouseAssignableVariantsQueryData,
  WarehouseAssignableVariantsQueryVariables,
} from "../graphql/operation-types";

export interface UseVariantsOptions extends RelayCursorPaginationVariables {
  where?: ApiVariantWhereInput | null;
  orderBy?: ApiVariantOrderByInput[] | null;
  skip?: boolean;
}

export interface UseVariantsReturn {
  variants: ApiVariant[];
  connection: ApiVariantConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useVariants(options: UseVariantsOptions = {}): UseVariantsReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    skip = false,
  } = options;

  const result = useRelayConnectionQuery<
    VariantsQueryData,
    VariantsQueryVariables,
    ApiVariant,
    ApiVariantConnection
  >({
    query: VARIANTS_QUERY,
    variables: { first, after, last, before, where, orderBy },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.variants,
  });

  return {
    variants: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export interface UseWarehouseAssignableVariantsOptions
  extends Omit<UseVariantsOptions, "where" | "orderBy"> {
  warehouseId: string;
  where?: ApiWarehouseAssignableVariantWhereInput | null;
  orderBy?: ApiWarehouseAssignableVariantOrderByInput[] | null;
}

export function useWarehouseAssignableVariants(
  options: UseWarehouseAssignableVariantsOptions,
): UseVariantsReturn {
  const {
    warehouseId,
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    skip = false,
  } = options;

  const result = useRelayConnectionQuery<
    WarehouseAssignableVariantsQueryData,
    WarehouseAssignableVariantsQueryVariables,
    ApiVariant,
    ApiVariantConnection
  >({
    query: WAREHOUSE_ASSIGNABLE_VARIANTS_QUERY,
    variables: { warehouseId, first, after, last, before, where, orderBy },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) =>
      data?.inventoryQuery.warehouseAssignableVariants,
  });

  return {
    variants: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
