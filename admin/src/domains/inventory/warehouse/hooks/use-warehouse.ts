"use client";

import { useQuery } from "@apollo/client/react";
import type { ApiWarehouse } from "@/graphql/types";
import { WAREHOUSE_DETAILS_QUERY } from "../graphql";
import type {
  WarehouseDetailsQueryData,
  WarehouseDetailsQueryVariables,
} from "../graphql";

export interface UseWarehouseOptions {
  id: string | null;
  skip?: boolean;
}

interface UseWarehouseReturn {
  warehouse: ApiWarehouse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useWarehouse(options: UseWarehouseOptions): UseWarehouseReturn {
  const {
    id,
    skip = false,
  } = options;

  const { data, previousData, loading, error, refetch } = useQuery<
    WarehouseDetailsQueryData,
    WarehouseDetailsQueryVariables
  >(WAREHOUSE_DETAILS_QUERY, {
    variables: {
      id: id ?? "",
    },
    skip: skip || !id,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;

  return {
    warehouse: effectiveData?.inventoryQuery.warehouse ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
