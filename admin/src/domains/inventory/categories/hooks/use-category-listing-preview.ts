"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiListingFacet,
  ApiListingOrderByInput,
  ApiListingProductFilter,
  ApiPageInfo,
} from "@/graphql/types";
import { CATEGORY_LISTING_PREVIEW_QUERY } from "../graphql";
import type {
  CategoryListingPreviewItem,
  CategoryListingPreviewQueryData,
  CategoryListingPreviewQueryVariables,
} from "../graphql/operation-types";

export interface UseCategoryListingPreviewOptions {
  first?: number;
  after?: string | null;
  query?: string | null;
  facets?: ApiListingProductFilter[] | null;
  orderBy?: ApiListingOrderByInput | null;
  skip?: boolean;
}

export interface UseCategoryListingPreviewReturn {
  items: CategoryListingPreviewItem[];
  facets: ApiListingFacet[];
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useCategoryListingPreview(
  categoryId?: string | null,
  options: UseCategoryListingPreviewOptions = {},
): UseCategoryListingPreviewReturn {
  const {
    first = 24,
    after = null,
    query = null,
    facets = null,
    orderBy = null,
    skip = false,
  } = options;

  const { data, previousData, loading, error, refetch } = useQuery<
    CategoryListingPreviewQueryData,
    CategoryListingPreviewQueryVariables
  >(CATEGORY_LISTING_PREVIEW_QUERY, {
    variables: {
      categoryId: categoryId ?? "",
      first,
      after,
      query,
      facets,
      orderBy,
    },
    skip: skip || !categoryId,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const activeData = data ?? previousData;
  const connection = activeData?.listingQuery.listing ?? null;

  return {
    items: connection?.edges.map((edge) => edge.node) ?? [],
    facets: connection?.facets ?? [],
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch,
  };
}
