"use client";

import { useQuery } from "@apollo/client/react";
import { SEARCH_SYNONYM_GROUP_EDITOR_QUERY } from "../graphql";
import type {
  SearchSynonymGroupEditorQueryData,
  SearchSynonymGroupEditorQueryVariables,
} from "../graphql/operation-types";

export function useSynonymGroup(id: string | undefined, skip = false) {
  const { data, previousData, loading, error, refetch } = useQuery<
    SearchSynonymGroupEditorQueryData,
    SearchSynonymGroupEditorQueryVariables
  >(SEARCH_SYNONYM_GROUP_EDITOR_QUERY, {
    variables: { id: id ?? "" },
    skip: skip || !id,
    fetchPolicy: "cache-and-network",
  });
  const currentData = data ?? previousData;

  return {
    synonymGroup: currentData?.listingQuery.search.synonymGroup ?? null,
    settings: currentData?.listingQuery.search.settings ?? null,
    loading,
    error: error ?? null,
    refetch,
  };
}
