"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import type {
  ApiPageInfo,
  ApiVariantOrderByInput,
  ApiVariantWhereInput,
  ApiWarehouse,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import {
  INVENTORY_DEFAULT_WAREHOUSE_QUERY,
  INVENTORY_VARIANTS_QUERY,
} from "../graphql";
import type {
  InventoryDefaultWarehouseQueryData,
  InventoryDefaultWarehouseQueryVariables,
  InventoryVariantsQueryData,
  InventoryVariantsQueryVariables,
} from "../graphql";
import {
  mapInventoryVariantEdgesToRows,
  type InventoryVariantRow,
} from "../mappers";

export interface UseInventoryVariantsOptions extends RelayCursorPaginationVariables {
  where?: ApiVariantWhereInput | null;
  orderBy: ApiVariantOrderByInput[];
  skip?: boolean;
}

export interface UseInventoryVariantsReturn {
  rows: InventoryVariantRow[];
  defaultWarehouse: ApiWarehouse | null;
  pageInfo: ApiPageInfo | null;
  totalCount: number;
  loading: boolean;
  error: Error | null;
  canEdit: boolean;
  readOnlyReason: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryVariants({
  first,
  after = null,
  last,
  before = null,
  where = null,
  orderBy,
  skip = false,
}: UseInventoryVariantsOptions): UseInventoryVariantsReturn {
  const {
    data: warehouseData,
    previousData: previousWarehouseData,
    loading: warehouseLoading,
    error: warehouseError,
    refetch: refetchDefaultWarehouse,
  } = useQuery<
    InventoryDefaultWarehouseQueryData,
    InventoryDefaultWarehouseQueryVariables
  >(INVENTORY_DEFAULT_WAREHOUSE_QUERY, {
    fetchPolicy: "cache-and-network",
    skip,
  });

  const {
    data,
    previousData,
    loading: variantsLoading,
    error: variantsError,
    refetch: refetchVariants,
  } = useQuery<InventoryVariantsQueryData, InventoryVariantsQueryVariables>(
    INVENTORY_VARIANTS_QUERY,
    {
      variables: {
        first,
        after,
        last,
        before,
        where,
        orderBy,
      },
      fetchPolicy: "cache-and-network",
      skip,
    },
  );

  const effectiveWarehouseData = warehouseData ?? previousWarehouseData;
  const defaultWarehouse =
    effectiveWarehouseData?.inventoryQuery.warehouses.edges[0]?.node ?? null;

  const effectiveData = data ?? previousData;
  const connection = effectiveData?.catalogQuery.variants ?? null;

  const rows = useMemo(
    () =>
      connection
        ? mapInventoryVariantEdgesToRows(connection.edges, defaultWarehouse)
        : [],
    [connection, defaultWarehouse],
  );

  const refetch = useCallback(async () => {
    await Promise.all([refetchDefaultWarehouse(), refetchVariants()]);
  }, [refetchDefaultWarehouse, refetchVariants]);

  const readOnlyReason = defaultWarehouse
    ? null
    : "Default warehouse is not configured";

  return {
    rows,
    defaultWarehouse,
    pageInfo: connection?.pageInfo ?? null,
    totalCount: connection?.totalCount ?? 0,
    loading: warehouseLoading || variantsLoading,
    error: variantsError ?? warehouseError ?? null,
    canEdit: Boolean(defaultWarehouse),
    readOnlyReason,
    refetch,
  };
}
