"use client";

import { useQuery } from "@apollo/client/react";
import { useDefaultCurrency } from "@/domains/workspace";
import type {
  ApiCustomer,
  ApiCustomerConnection,
  ApiPageInfo,
} from "@/graphql/types";
import { CUSTOMERS_QUERY } from "../graphql";
import type {
  CustomersQueryData,
  CustomersQueryVariables,
} from "../graphql/operation-types";

export interface UseCustomersReturn {
  customers: ApiCustomer[];
  connection: ApiCustomerConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useCustomers(variables: CustomersQueryVariables): UseCustomersReturn {
  const defaultCurrency = useDefaultCurrency();
  const { data, previousData, loading, error, refetch } = useQuery<
    CustomersQueryData,
    CustomersQueryVariables
  >(CUSTOMERS_QUERY, {
    variables: { ...variables, currencyCode: variables.currencyCode ?? defaultCurrency },
    fetchPolicy: "cache-and-network",
  });
  const connection = (data ?? previousData)?.customersQuery.customers ?? null;

  return {
    customers: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
