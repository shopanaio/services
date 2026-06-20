"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import type { ApiWarehouse } from "@/graphql/types";
import { INVENTORY_DEFAULT_WAREHOUSE_QUERY } from "../graphql";
import type {
  InventoryDefaultWarehouseQueryData,
  InventoryDefaultWarehouseQueryVariables,
} from "../graphql";

export interface UseDefaultWarehouseReturn {
  defaultWarehouse: ApiWarehouse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<ApiWarehouse | null>;
}

export function useDefaultWarehouse(): UseDefaultWarehouseReturn {
  const { data, loading, error, refetch: refetchDefaultWarehouse } = useQuery<
    InventoryDefaultWarehouseQueryData,
    InventoryDefaultWarehouseQueryVariables
  >(INVENTORY_DEFAULT_WAREHOUSE_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const defaultWarehouse =
    data?.inventoryQuery.warehouses.edges[0]?.node ?? null;

  const refetch = useCallback(async () => {
    const result = await refetchDefaultWarehouse();

    return result.data?.inventoryQuery.warehouses.edges[0]?.node ?? null;
  }, [refetchDefaultWarehouse]);

  return useMemo(
    () => ({
      defaultWarehouse,
      loading,
      error: error ?? null,
      refetch,
    }),
    [defaultWarehouse, error, loading, refetch],
  );
}
