"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiPageInfo } from "@/graphql/types";
import { requestCustomers } from "../api/request-customers";
import type {
  ApiCustomer,
  CustomerConnection,
  CustomersQueryVariables,
} from "../graphql/operation-types";

export interface UseCustomersReturn {
  customers: ApiCustomer[];
  connection: CustomerConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useCustomers(variables: CustomersQueryVariables): UseCustomersReturn {
  const requestIdRef = useRef(0);
  const [connection, setConnection] = useState<CustomerConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await requestCustomers(variables);
      if (requestId === requestIdRef.current) {
        setConnection(data.customersQuery.customers);
      }
      return data;
    } catch (cause) {
      const normalized = cause instanceof Error ? cause : new Error("Unable to load customers");
      if (requestId === requestIdRef.current) setError(normalized);
      throw normalized;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [variables]);

  useEffect(() => {
    void execute().catch(() => undefined);
  }, [execute]);

  return {
    customers: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error,
    refetch: execute,
  };
}
