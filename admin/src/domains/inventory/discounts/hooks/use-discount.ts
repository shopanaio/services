"use client";

import { useQuery } from "@apollo/client/react";
import { DISCOUNT_DETAILS_QUERY } from "../graphql";
import type {
  DiscountDetailsQueryData,
  DiscountDetailsQueryDiscount,
  DiscountDetailsQueryVariables,
} from "../graphql/operation-types";

interface UseDiscountReturn {
  discount: DiscountDetailsQueryDiscount | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useDiscount(id?: string | null): UseDiscountReturn {
  const { data, previousData, loading, error, refetch } = useQuery<
    DiscountDetailsQueryData,
    DiscountDetailsQueryVariables
  >(DISCOUNT_DETAILS_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;

  return {
    discount: effectiveData?.pricingQuery.discount ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
