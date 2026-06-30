"use client";

import { useCallback, useEffect, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import type { ApiVariant, ApiVariantConnection } from "@/graphql/types";
import { PRODUCT_VARIANTS_QUERY } from "../graphql";
import type {
  ProductVariantsQueryData,
  ProductVariantsQueryVariables,
} from "../graphql/operation-types";

type ProductApolloClient = ReturnType<typeof useApolloClient>;

export const EMPTY_VARIANT_CONNECTION: ApiVariantConnection = {
  __typename: "VariantConnection",
  edges: [],
  pageInfo: {
    __typename: "PageInfo",
    hasNextPage: false,
    hasPreviousPage: false,
  },
  totalCount: 0,
};

export interface FetchProductVariantsPageInput {
  productId: string;
  first: number;
  after?: string | null;
}

export async function fetchProductVariantsPage(
  client: ProductApolloClient,
  input: FetchProductVariantsPageInput,
): Promise<ApiVariantConnection> {
  const result = await client.query<
    ProductVariantsQueryData,
    ProductVariantsQueryVariables
  >({
    query: PRODUCT_VARIANTS_QUERY,
    variables: {
      id: input.productId,
      first: input.first,
      after: input.after ?? null,
    },
    fetchPolicy: "network-only",
  });

  return result.data?.catalogQuery.product?.variants ?? EMPTY_VARIANT_CONNECTION;
}

export function getVariantsFromConnection(
  connection: ApiVariantConnection,
): ApiVariant[] {
  return connection.edges.map((edge) => edge.node);
}

export function appendVariantConnection(
  previous: ApiVariantConnection,
  next: ApiVariantConnection,
): ApiVariantConnection {
  const seenIds = new Set(previous.edges.map((edge) => edge.node.id));
  const appendedEdges = next.edges.filter((edge) => !seenIds.has(edge.node.id));

  return {
    ...next,
    edges: [...previous.edges, ...appendedEdges],
  };
}

export interface UseProductVariantsConnectionOptions {
  productId: string | null;
  pageSize?: number;
  skip?: boolean;
}

export interface UseProductVariantsConnectionReturn {
  variants: ApiVariantConnection;
  loading: boolean;
  error: Error | null;
  loadMore: () => Promise<ApiVariantConnection | null>;
  refetch: () => Promise<ApiVariantConnection | null>;
}

const DEFAULT_VARIANTS_PAGE_SIZE = 20;

export function useProductVariantsConnection({
  productId,
  pageSize = DEFAULT_VARIANTS_PAGE_SIZE,
  skip = false,
}: UseProductVariantsConnectionOptions): UseProductVariantsConnectionReturn {
  const client = useApolloClient();
  const [variants, setVariants] = useState<ApiVariantConnection>(
    EMPTY_VARIANT_CONNECTION,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(
    async (first: number, after: string | null) => {
      if (!productId) {
        return EMPTY_VARIANT_CONNECTION;
      }

      return fetchProductVariantsPage(client, {
        productId,
        first,
        after,
      });
    },
    [client, productId],
  );

  const refetch = useCallback(async () => {
    if (!productId || skip) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedCount = Math.max(pageSize, variants.edges.length);
      const connection = await fetchPage(loadedCount, null);

      setVariants(connection);
      return connection;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load variants"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchPage, pageSize, productId, skip, variants.edges.length]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialPage = async () => {
      setVariants(EMPTY_VARIANT_CONNECTION);
      setError(null);

      if (!productId || skip) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const connection = await fetchPage(pageSize, null);

        if (!cancelled) {
          setVariants(connection);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error("Failed to load variants"),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInitialPage();

    return () => {
      cancelled = true;
    };
  }, [fetchPage, pageSize, productId, skip]);

  const loadMore = useCallback(async () => {
    if (!productId || skip || loading || !variants.pageInfo.hasNextPage) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const connection = await fetchPage(
        pageSize,
        variants.pageInfo.endCursor ?? null,
      );

      setVariants((current) => appendVariantConnection(current, connection));
      return connection;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load more variants"),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    fetchPage,
    loading,
    pageSize,
    productId,
    skip,
    variants.pageInfo.endCursor,
    variants.pageInfo.hasNextPage,
  ]);

  return {
    variants,
    loading,
    error,
    loadMore,
    refetch,
  };
}
