"use client";

import { useQuery } from "@apollo/client/react";
import { CUSTOMER_EDITOR_CONTEXT_QUERY } from "../graphql";
import type { CustomerEditorContextQueryData } from "../graphql/operation-types";

export function useCustomerEditorContext() {
  const { data, previousData, loading, error, refetch } = useQuery<
    CustomerEditorContextQueryData
  >(CUSTOMER_EDITOR_CONTEXT_QUERY, { fetchPolicy: "cache-and-network" });
  const customersQuery = (data ?? previousData)?.customersQuery;

  return {
    context: customersQuery
      ? {
          segments: customersQuery.customerSegments.edges.map((edge) => edge.node),
          tags: customersQuery.customerTags.edges.map((edge) => edge.node),
        }
      : null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
