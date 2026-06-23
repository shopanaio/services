"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiPageInfo,
  ApiVendor,
  ApiVendorConnection,
  ApiVendorOrderByInput,
  ApiVendorWhereInput,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { VENDORS_QUERY } from "../graphql";
import type {
  VendorsQueryData,
  VendorsQueryVariables,
} from "../graphql";

export interface UseVendorsOptions extends RelayCursorPaginationVariables {
  where?: ApiVendorWhereInput | null;
  orderBy?: ApiVendorOrderByInput[] | null;
  skip?: boolean;
  fetchPolicy?: "cache-and-network" | "network-only";
}

interface UseVendorsReturn {
  vendors: ApiVendor[];
  connection: ApiVendorConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useVendors(
  options: UseVendorsOptions = {},
): UseVendorsReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    skip = false,
    fetchPolicy = "cache-and-network",
  } = options;

  const { data, previousData, loading, error, refetch } = useQuery<
    VendorsQueryData,
    VendorsQueryVariables
  >(VENDORS_QUERY, {
    variables: { first, after, last, before, where, orderBy },
    skip,
    fetchPolicy,
  });

  const effectiveData = data ?? previousData;
  const connection = effectiveData?.catalogQuery.vendors ?? null;

  return {
    vendors: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
