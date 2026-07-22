"use client";

import { useQuery } from "@apollo/client/react";
import type { ApiStore } from "@/graphql/types";
import { GENERAL_SETTINGS_QUERY } from "../graphql";

export const useGeneralSettings = () => {
  const { data, loading, error, refetch } = useQuery<{
    storeQuery: { currentStore: ApiStore | null };
  }>(GENERAL_SETTINGS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  return {
    store: data?.storeQuery.currentStore ?? null,
    loading,
    error: error ?? null,
    refetch: async () => {
      await refetch();
    },
  };
};
