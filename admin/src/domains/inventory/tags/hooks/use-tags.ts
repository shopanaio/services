"use client";

import { useQuery } from "@apollo/client/react";
import type {
  ApiPageInfo,
  ApiTag,
  ApiTagConnection,
  ApiTagOrderByInput,
  ApiTagWhereInput,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { TAGS_QUERY } from "../graphql";
import type {
  TagsQueryData,
  TagsQueryVariables,
} from "../graphql";

export interface UseTagsOptions extends RelayCursorPaginationVariables {
  where?: ApiTagWhereInput | null;
  orderBy?: ApiTagOrderByInput[] | null;
  skip?: boolean;
}

interface UseTagsReturn {
  tags: ApiTag[];
  connection: ApiTagConnection | null;
  totalCount: number;
  pageInfo: ApiPageInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const {
    first,
    after = null,
    last,
    before = null,
    where = null,
    orderBy = null,
    skip = false,
  } = options;

  const { data, previousData, loading, error, refetch } = useQuery<
    TagsQueryData,
    TagsQueryVariables
  >(TAGS_QUERY, {
    variables: { first, after, last, before, where, orderBy },
    skip,
    fetchPolicy: "cache-and-network",
  });

  const effectiveData = data ?? previousData;
  const connection = effectiveData?.catalogQuery.tags ?? null;

  return {
    tags: connection?.edges.map((edge) => edge.node) ?? [],
    connection,
    totalCount: connection?.totalCount ?? 0,
    pageInfo: connection?.pageInfo ?? null,
    loading,
    error: error ?? null,
    refetch: () => refetch(),
  };
}
