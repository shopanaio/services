"use client";

import { useQuery } from "@apollo/client/react";
import type { ApiProduct } from "@/graphql/types";
import { PRODUCT_DETAILS_QUERY } from "../graphql";
import type {
  ProductDetailsQueryData,
  ProductDetailsQueryVariables,
} from "../graphql/operation-types";

export interface UseProductOptions {
  id: string | null;
  variantsFirst?: number;
  variantsAfter?: string | null;
  skip?: boolean;
}

interface UseProductReturn {
  product: ApiProduct | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useProduct(options: UseProductOptions): UseProductReturn {
  const {
    id,
    variantsFirst,
    variantsAfter = null,
    skip = false,
  } = options;

  const { data, previousData, loading, error, refetch } = useQuery<
    ProductDetailsQueryData,
    ProductDetailsQueryVariables
  >(PRODUCT_DETAILS_QUERY, {
    variables: {
      id: id ?? "",
      variantsFirst,
      variantsAfter,
    },
    skip: skip || !id,
    fetchPolicy: "cache-and-network",
  });

  const product = data?.catalogQuery.product ?? null;
  const previousProduct = previousData?.catalogQuery.product ?? null;
  const effectiveProduct =
    data === undefined && previousProduct?.id === id ? previousProduct : product;

  return {
    product: effectiveProduct,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
