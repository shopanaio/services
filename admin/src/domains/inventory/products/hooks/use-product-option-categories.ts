"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiPageInfo,
  ApiProductOptionCategory,
  ApiProductOptionCategoryOrderByInput,
  ApiProductOptionCategoryWhereInput,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { PRODUCT_OPTION_CATEGORIES_QUERY } from "../graphql/queries";
import type {
  ProductOptionCategoriesQueryData,
  ProductOptionCategoriesQueryVariables,
} from "../graphql/operation-types";

export interface UseProductOptionCategoriesOptions
  extends RelayCursorPaginationVariables {
  where?: ApiProductOptionCategoryWhereInput | null;
  orderBy?: ApiProductOptionCategoryOrderByInput[] | null;
  fetchPolicy?: "cache-and-network" | "network-only";
}

export function useProductOptionCategories(
  options: UseProductOptionCategoriesOptions = {},
) {
  const { data, previousData, loading, error } = useQuery<
    ProductOptionCategoriesQueryData,
    ProductOptionCategoriesQueryVariables
  >(PRODUCT_OPTION_CATEGORIES_QUERY, {
    variables: {
      first: options.first,
      after: options.after ?? null,
      last: options.last,
      before: options.before ?? null,
      where: options.where ?? null,
      orderBy: options.orderBy ?? null,
    },
    fetchPolicy: options.fetchPolicy ?? "cache-and-network",
  });
  const connection = (data ?? previousData)?.catalogQuery.productOptionCategories;
  return {
    categories: (connection?.edges.map((edge) => edge.node) ?? []) as ApiProductOptionCategory[],
    totalCount: connection?.totalCount ?? 0,
    pageInfo: (connection?.pageInfo ?? null) as ApiPageInfo | null,
    loading,
    error: error ?? null,
  };
}
