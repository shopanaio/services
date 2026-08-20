"use client";

import { useQuery } from "@apollo/client/react";
import { SEARCH_SETTINGS_EDITOR_QUERY, type SearchSettingsEditorQueryData } from "../graphql";

export function useSearchEditorContext(skip = false) {
  const { data, previousData, loading, error, refetch } = useQuery<SearchSettingsEditorQueryData>(
    SEARCH_SETTINGS_EDITOR_QUERY,
    {
      fetchPolicy: "cache-and-network",
      skip,
    },
  );
  const currentData = data ?? previousData;

  return {
    settings: currentData?.listingQuery.search.settings ?? null,
    loading,
    hasLoaded: Boolean(currentData) || Boolean(error),
    error: error ?? null,
    refetch,
  };
}
