"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import type {
  ApiInventoryItem,
  ApiInventoryItemConnection,
  ApiInventoryItemInventoryItemsMetaInput,
  ApiInventoryItemOrderByInput,
  ApiInventoryItemWhereInput,
  ApiPageInfo,
  ApiWarehouse,
} from "@/graphql/types";
import { InventoryItemWarehouseScopeMode } from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import {
  INVENTORY_DEFAULT_WAREHOUSE_QUERY,
  INVENTORY_ITEMS_QUERY,
} from "../graphql";
import type {
  InventoryDefaultWarehouseQueryData,
  InventoryDefaultWarehouseQueryVariables,
  InventoryItemsQueryData,
  InventoryItemsQueryVariables,
} from "../graphql";
import {
  mapInventoryVariantEdgesToRows,
  type InventoryVariantRow,
} from "../mappers";

export interface UseInventoryItemsOptions
  extends RelayCursorPaginationVariables {
  where?: ApiInventoryItemWhereInput | null;
  orderBy?: ApiInventoryItemOrderByInput[] | null;
  meta?: ApiInventoryItemInventoryItemsMetaInput | null;
  skip?: boolean;
}

export interface UseInventoryItemsReturn {
  rows: InventoryVariantRow[];
  connection: ApiInventoryItemConnection | null;
  defaultWarehouse: ApiWarehouse | null;
  pageInfo: ApiPageInfo | null;
  totalCount: number;
  loading: boolean;
  error: Error | null;
  canEdit: boolean;
  readOnlyReason: string | null;
  refetch: () => Promise<unknown>;
}

function buildDefaultWarehouseScopeMeta(
  defaultWarehouse: Pick<ApiWarehouse, "id"> | null,
): ApiInventoryItemInventoryItemsMetaInput | null {
  if (!defaultWarehouse) {
    return null;
  }

  return {
    warehouseScope: {
      mode: InventoryItemWarehouseScopeMode.Include,
      referenceIds: [defaultWarehouse.id],
    },
  };
}

export function useInventoryItems({
  first,
  after = null,
  last,
  before = null,
  where = null,
  orderBy = null,
  meta = null,
  skip = false,
}: UseInventoryItemsOptions): UseInventoryItemsReturn {
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

  const effectiveWarehouseData = warehouseData ?? previousWarehouseData;
  const defaultWarehouse =
    effectiveWarehouseData?.inventoryQuery.warehouses.edges[0]?.node ?? null;
  const waitingForWarehouse = warehouseLoading && !effectiveWarehouseData;
  const inventoryItemsMeta = useMemo(
    () => meta ?? buildDefaultWarehouseScopeMeta(defaultWarehouse),
    [defaultWarehouse, meta],
  );

  const inventoryResult = useRelayConnectionQuery<
    InventoryItemsQueryData,
    InventoryItemsQueryVariables,
    ApiInventoryItem,
    ApiInventoryItemConnection
  >({
    query: INVENTORY_ITEMS_QUERY,
    variables: {
      first,
      after,
      last,
      before,
      where,
      orderBy,
      meta: inventoryItemsMeta,
    },
    skip: skip || waitingForWarehouse,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.inventoryQuery.inventoryItems,
  });

  const connection = inventoryResult.connection;
  const rows = useMemo(
    () =>
      connection
        ? mapInventoryVariantEdgesToRows(connection.edges, defaultWarehouse)
        : [],
    [connection, defaultWarehouse],
  );

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchDefaultWarehouse(),
      inventoryResult.refetch(),
    ]);
  }, [inventoryResult, refetchDefaultWarehouse]);

  const readOnlyReason = defaultWarehouse
    ? null
    : "Default warehouse is not configured";

  return {
    rows,
    connection,
    defaultWarehouse,
    pageInfo: inventoryResult.pageInfo,
    totalCount: inventoryResult.totalCount,
    loading: warehouseLoading || inventoryResult.loading,
    error: inventoryResult.error ?? warehouseError ?? null,
    canEdit: Boolean(defaultWarehouse),
    readOnlyReason,
    refetch,
  };
}
