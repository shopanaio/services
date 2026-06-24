"use client";

import { useQuery } from "@apollo/client/react";
import type { ApiTag } from "@/graphql/types";
import { TAG_DETAILS_QUERY } from "../graphql";
import type {
  TagDetailsQueryData,
  TagDetailsQueryVariables,
} from "../graphql/operation-types";

interface UseTagReturn {
  tag: ApiTag | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useTag(id?: string | null): UseTagReturn {
  const { data, previousData, loading, error, refetch } = useQuery<
    TagDetailsQueryData,
    TagDetailsQueryVariables
  >(TAG_DETAILS_QUERY, {
    variables: { id: id ?? "" },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;

  return {
    tag: effectiveData?.catalogQuery.tag ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
