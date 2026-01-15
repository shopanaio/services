"use client";

import { useQuery } from "@apollo/client/react";
import { FILES_QUERY } from "../graphql";
import type { ApiFile, ApiPageInfo } from "@/graphql/types";

interface UseFilesOptions {
  /**
   * Number of items to fetch.
   */
  first?: number;
  /**
   * Cursor for forward pagination.
   */
  after?: string | null;
  /**
   * Skip the query.
   */
  skip?: boolean;
}

interface UseFilesReturn {
  /**
   * List of files.
   */
  files: ApiFile[];
  /**
   * Total count of files.
   */
  totalCount: number;
  /**
   * Pagination info.
   */
  pageInfo: ApiPageInfo | null;
  /**
   * Whether the query is loading.
   */
  loading: boolean;
  /**
   * Error from the query, if any.
   */
  error: Error | null;
  /**
   * Refetch the files list.
   */
  refetch: () => void;
  /**
   * Fetch the next page.
   */
  fetchNextPage: () => void;
  /**
   * Fetch the previous page.
   */
  fetchPreviousPage: () => void;
}

interface FilesQueryResponse {
  mediaQuery: {
    files: {
      edges: Array<{
        cursor: string;
        node: ApiFile;
      }>;
      pageInfo: ApiPageInfo;
      totalCount: number;
    };
  };
}

/**
 * Hook for fetching paginated files from the media service.
 *
 * @example
 * ```tsx
 * const { files, loading, pageInfo } = useFiles({ first: 20 });
 * ```
 */
export function useFiles(options: UseFilesOptions = {}): UseFilesReturn {
  const { first = 20, after = null, skip = false } = options;

  const { data, loading, error, refetch, fetchMore } =
    useQuery<FilesQueryResponse>(FILES_QUERY, {
      variables: { first, after },
      skip,
      fetchPolicy: "cache-and-network",
    });

  const files = data?.mediaQuery.files.edges.map((edge) => edge.node) ?? [];
  const pageInfo = data?.mediaQuery.files.pageInfo ?? null;
  const totalCount = data?.mediaQuery.files.totalCount ?? 0;

  const fetchNextPage = () => {
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      fetchMore({
        variables: { first, after: pageInfo.endCursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return fetchMoreResult;
        },
      });
    }
  };

  const fetchPreviousPage = () => {
    if (pageInfo?.hasPreviousPage && pageInfo.startCursor) {
      fetchMore({
        variables: { last: first, before: pageInfo.startCursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return fetchMoreResult;
        },
      });
    }
  };

  return {
    files,
    totalCount,
    pageInfo,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
    fetchNextPage,
    fetchPreviousPage,
  };
}
