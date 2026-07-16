"use client";

import { useQuery } from "@apollo/client/react";
import { CUSTOMER_QUERY } from "../graphql";
import type {
  CustomerQueryData,
  CustomerQueryVariables,
} from "../graphql/operation-types";

export function useCustomer(id?: string) {
  const { data, previousData, loading, error, refetch } = useQuery<
    CustomerQueryData,
    CustomerQueryVariables
  >(CUSTOMER_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  return {
    customer: (data ?? previousData)?.customersQuery.customer ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
