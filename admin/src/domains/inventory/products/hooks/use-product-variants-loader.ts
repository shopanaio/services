"use client";

import { useCallback, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import type { ApiProduct, ApiVariant } from "@/graphql/types";
import {
  fetchProductVariantsPage,
  getVariantsFromConnection,
} from "./use-product-variants-connection";

const VARIANTS_PAGE_SIZE = 100;

function getLoadedVariants(product: ApiProduct): ApiVariant[] {
  return getVariantsFromConnection(product.variants);
}

function hasCompleteVariantPage(product: ApiProduct): boolean {
  return (
    !product.variants.pageInfo.hasPreviousPage &&
    !product.variants.pageInfo.hasNextPage &&
    product.variants.edges.length >= product.variants.totalCount
  );
}

interface UseProductVariantsLoaderReturn {
  loadAllProductVariants: (product: ApiProduct) => Promise<ApiVariant[]>;
  loading: boolean;
}

export function useProductVariantsLoader(): UseProductVariantsLoaderReturn {
  const client = useApolloClient();
  const [loading, setLoading] = useState(false);

  const loadAllProductVariants = useCallback(
    async (product: ApiProduct): Promise<ApiVariant[]> => {
      if (hasCompleteVariantPage(product)) {
        return getLoadedVariants(product);
      }

      setLoading(true);

      try {
        const variants: ApiVariant[] = [];
        let after: string | null = null;
        let hasNextPage = true;

        while (hasNextPage) {
          const connection = await fetchProductVariantsPage(client, {
            productId: product.id,
            first: VARIANTS_PAGE_SIZE,
            after,
          });

          variants.push(...getVariantsFromConnection(connection));
          hasNextPage = connection.pageInfo.hasNextPage;
          after = connection.pageInfo.endCursor ?? null;

          if (hasNextPage && !after) {
            throw new Error("Product variants pagination cursor is missing");
          }
        }

        return variants;
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return {
    loadAllProductVariants,
    loading,
  };
}
