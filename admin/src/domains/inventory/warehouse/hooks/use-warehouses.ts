"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiPageInfo,
  ApiWarehouse,
  ApiWarehouseConnection,
  ApiWarehouseOrderByInput,
  ApiWarehouseWhereInput,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { WAREHOUSES_QUERY } from "../graphql";
import type {
  WarehousesQueryData,
  WarehousesQueryVariables,
} from "../graphql";

export interface UseWarehousesOptions extends RelayCursorPaginationVariables {
  where?: ApiWarehouseWhereInput | null;
  orderBy?: ApiWarehouseOrderByInput[] | null;
  skip?: boolean;
}

interface UseWarehousesReturn {
  warehouses: ApiWarehouse[];
  connection: ApiWarehouseConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useWarehouses(
  options: UseWarehousesOptions = {},
): UseWarehousesReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    skip = false,
  } = options;

  const { data, previousData, loading, error, refetch } = useQuery<
    WarehousesQueryData,
    WarehousesQueryVariables
  >(WAREHOUSES_QUERY, {
    variables: {
      first,
      after,
      last,
      before,
      where,
      orderBy,
    },
    skip,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;
  const connection = effectiveData?.inventoryQuery.warehouses ?? null;

  return {
    warehouses: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
