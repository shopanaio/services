"use client";

import { useQuery } from "@apollo/client/react";
import { SEARCH_PRODUCT_BOOST_EDITOR_QUERY } from "../graphql";
import type {
  SearchProductBoostEditorQueryData,
  SearchProductBoostEditorQueryVariables,
} from "../graphql/operation-types";

export function useProductBoost(id: string | undefined, skip = false) {
  const { data, previousData, loading, error, refetch } = useQuery<
    SearchProductBoostEditorQueryData,
    SearchProductBoostEditorQueryVariables
  >(SEARCH_PRODUCT_BOOST_EDITOR_QUERY, {
    variables: { id: id ?? "" },
    skip: skip || !id,
    fetchPolicy: "cache-and-network",
  });
  const currentData = data ?? previousData;

  return {
    productBoost: currentData?.listingQuery.search.productBoost ?? null,
    settings: currentData?.listingQuery.search.settings ?? null,
    loading,
    error: error ?? null,
    refetch,
  };
}
