"use client";

import type {
  ApiPageInfo,
  ApiTag,
  ApiTagConnection,
  ApiTagOrderByInput,
  ApiTagWhereInput,
} from "@/graphql/types";
import { useRelayConnectionQuery } from "@/graphql/hooks/use-relay-connection-query";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import { TAGS_QUERY } from "../graphql";
import type {
  TagsQueryData,
  TagsQueryVariables,
} from "../graphql/operation-types";

export interface UseTagsOptions extends RelayCursorPaginationVariables {
  where?: ApiTagWhereInput | null;
  orderBy?: ApiTagOrderByInput[] | null;
  skip?: boolean;
}

export interface UseTagsReturn {
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

  const result = useRelayConnectionQuery<
    TagsQueryData,
    TagsQueryVariables,
    ApiTag,
    ApiTagConnection
  >({
    query: TAGS_QUERY,
    variables: { first, after, last, before, where, orderBy },
    skip,
    fetchPolicy: "cache-and-network",
    getConnection: (data) => data?.catalogQuery.tags,
  });

  return {
    tags: result.nodes,
    connection: result.connection,
    totalCount: result.totalCount,
    pageInfo: result.pageInfo,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
