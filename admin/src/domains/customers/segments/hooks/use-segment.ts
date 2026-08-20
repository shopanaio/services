"use client";

import { useQuery } from "@apollo/client/react";
import { CUSTOMER_SEGMENT_QUERY } from "../graphql";
import type {
  CustomerSegmentQueryData,
  CustomerSegmentQueryVariables,
} from "../graphql/operation-types";

export function useCustomerSegment(id?: string) {
  const { data, previousData, loading, error, refetch } = useQuery<
    CustomerSegmentQueryData,
    CustomerSegmentQueryVariables
  >(CUSTOMER_SEGMENT_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  return {
    segment: (data ?? previousData)?.customersQuery.customerSegment ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
