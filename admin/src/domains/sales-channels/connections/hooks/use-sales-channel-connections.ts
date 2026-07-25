"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiAppDefinition,
  ApiPageInfo,
  ApiSalesChannelConnection,
} from "@/graphql/types";
import {
  SALES_CHANNEL_CONNECTIONS_QUERY,
  type SalesChannelConnectionsData,
  type SalesChannelConnectionsVariables,
} from "../graphql";

export function useSalesChannelConnections() {
  const { data, previousData, loading, error, refetch } = useQuery<
    SalesChannelConnectionsData,
    SalesChannelConnectionsVariables
  >(SALES_CHANNEL_CONNECTIONS_QUERY, {
    variables: { first: 50, after: null },
    fetchPolicy: "cache-and-network",
  });
  const current = data ?? previousData;
  const connection = current?.appsQuery.salesChannelConnections;
  return {
    connections:
      (connection?.edges.map((edge) => edge.node) ??
        []) as ApiSalesChannelConnection[],
    availableApps:
      (current?.appsQuery.availableApps ?? []) as ApiAppDefinition[],
    totalCount: connection?.totalCount ?? 0,
    pageInfo: (connection?.pageInfo ?? null) as ApiPageInfo | null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
