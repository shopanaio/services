"use client";

import { useQuery } from "@apollo/client/react";
import { SEARCH_CONFIGURATION_EDITOR_CONTEXT_QUERY } from "../graphql";
import type { SearchConfigurationEditorContextData } from "../graphql";

export function useSearchEditorContext(skip = false) {
  const { data, previousData, loading, error, refetch } =
    useQuery<SearchConfigurationEditorContextData>(
      SEARCH_CONFIGURATION_EDITOR_CONTEXT_QUERY,
      { fetchPolicy: "cache-and-network", skip },
    );
  const currentData = data ?? previousData;

  return {
    settings: currentData?.listingQuery.search.settings ?? null,
    loading,
    error: error ?? null,
    refetch,
  };
}
