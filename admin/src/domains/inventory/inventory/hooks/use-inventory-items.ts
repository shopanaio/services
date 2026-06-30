"use client";

import { useCallback, useMemo } from "react";
import type {
  ApiInventoryItem,
  ApiInventoryItemConnection,
  ApiInventoryItemInventoryItemsMetaInput,
  ApiInventoryItemOrderByInput,
  ApiInventoryItemWhereInput,
  ApiPageInfo,
} from "@/graphql/types";
import { InventoryItemWarehouseScopeMode } from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { INVENTORY_ITEMS_QUERY } from "../graphql";
import type {
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
  warehouseId?: string | null;
  skip?: boolean;
}

export interface UseInventoryItemsReturn {
  rows: InventoryVariantRow[];
  connection: ApiInventoryItemConnection | null;
  activeWarehouseId: string | null;
  pageInfo: ApiPageInfo | null;
  totalCount: number;
  loading: boolean;
  error: Error | null;
  canEdit: boolean;
  readOnlyReason: string | null;
  refetch: () => Promise<unknown>;
}

function buildWarehouseScopeMeta(
  warehouseId: string | null,
): ApiInventoryItemInventoryItemsMetaInput | null {
  if (!warehouseId) {
    return null;
  }

  return {
    warehouseScope: {
      mode: InventoryItemWarehouseScopeMode.Include,
      referenceIds: [warehouseId],
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
  warehouseId = null,
  skip = false,
}: UseInventoryItemsOptions): UseInventoryItemsReturn {
  const activeWarehouseId = warehouseId;
  const inventoryItemsMeta = useMemo(
    () => meta ?? buildWarehouseScopeMeta(activeWarehouseId),
    [activeWarehouseId, meta],
  );
  const inventoryItemsVariables = useMemo<InventoryItemsQueryVariables>(
    () => ({
      first,
      after,
      last,
      before,
      where,
      orderBy,
      ...(inventoryItemsMeta ? { meta: inventoryItemsMeta } : {}),
    }),
    [
      after,
      before,
      first,
      inventoryItemsMeta,
      last,
      orderBy,
      where,
    ],
  );

  const inventoryResult = useRelayConnectionQuery<
    InventoryItemsQueryData,
    InventoryItemsQueryVariables,
    ApiInventoryItem,
    ApiInventoryItemConnection
  >({
    query: INVENTORY_ITEMS_QUERY,
    variables: inventoryItemsVariables,
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.inventoryQuery.inventoryItems,
  });

  const connection = inventoryResult.connection;
  const rows = useMemo(
    () =>
      connection
        ? mapInventoryVariantEdgesToRows(connection.edges, activeWarehouseId)
        : [],
    [activeWarehouseId, connection],
  );

  const refetch = useCallback(async () => {
    await inventoryResult.refetch();
  }, [inventoryResult]);

  const readOnlyReason = activeWarehouseId
    ? null
    : "Select a warehouse to edit inventory.";

  return {
    rows,
    connection,
    activeWarehouseId,
    pageInfo: inventoryResult.pageInfo,
    totalCount: inventoryResult.totalCount,
    loading: inventoryResult.loading,
    error: inventoryResult.error,
    canEdit: Boolean(activeWarehouseId),
    readOnlyReason,
    refetch,
  };
}
