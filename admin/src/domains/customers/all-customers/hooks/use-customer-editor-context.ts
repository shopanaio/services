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
          groups: customersQuery.customerGroups.edges.map((edge) => edge.node),
          truncated: {
            segments: customersQuery.customerSegments.totalCount > customersQuery.customerSegments.edges.length,
            tags: customersQuery.customerTags.totalCount > customersQuery.customerTags.edges.length,
            groups: customersQuery.customerGroups.totalCount > customersQuery.customerGroups.edges.length,
          },
        }
      : null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
