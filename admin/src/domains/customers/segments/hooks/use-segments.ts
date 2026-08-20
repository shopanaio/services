"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiCustomerSegment,
  ApiCustomerSegmentConnection,
  ApiPageInfo,
} from "@/graphql/types";
import { CUSTOMER_SEGMENTS_QUERY } from "../graphql";
import type {
  CustomerSegmentsQueryData,
  CustomerSegmentsQueryVariables,
} from "../graphql/operation-types";

export interface UseCustomerSegmentsReturn {
  segments: ApiCustomerSegment[];
  connection: ApiCustomerSegmentConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useCustomerSegments(
  variables: CustomerSegmentsQueryVariables,
): UseCustomerSegmentsReturn {
  const { data, previousData, loading, error, refetch } = useQuery<
    CustomerSegmentsQueryData,
    CustomerSegmentsQueryVariables
  >(CUSTOMER_SEGMENTS_QUERY, { variables, fetchPolicy: "cache-and-network" });
  const connection = (data ?? previousData)?.customersQuery.customerSegments ?? null;

  return {
    segments: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
