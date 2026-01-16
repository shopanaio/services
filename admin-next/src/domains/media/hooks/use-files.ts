"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { FILES_QUERY } from "../graphql";
import type {
  ApiFile,
  ApiPageInfo,
  ApiFileWhereInput,
  ApiFileOrderByInput,
} from "@/graphql/types";
import { SortDirection, FileOrderField } from "@/graphql/types";

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
  /**
   * Search query for file name.
   */
  search?: string;
  /**
   * Filter conditions.
   */
  where?: ApiFileWhereInput;
  /**
   * Sort configuration.
   */
  orderBy?: ApiFileOrderByInput[];
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
   * Start of the current range (1-indexed).
   */
  rangeStart: number;
  /**
   * End of the current range.
   */
  rangeEnd: number;
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

export { SortDirection, FileOrderField };

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
 *
 * @example
 * ```tsx
 * // With search and filters
 * const { files } = useFiles({
 *   first: 20,
 *   search: "photo",
 *   where: { provider: { _eq: "S3" } },
 *   orderBy: [{ field: FileOrderField.CreatedAt, direction: SortDirection.Desc }],
 * });
 * ```
 */
export function useFiles(options: UseFilesOptions = {}): UseFilesReturn {
  const {
    first = 20,
    after = null,
    skip = false,
    search,
    where: externalWhere,
    orderBy,
  } = options;
  const [currentPage, setCurrentPage] = useState(0);

  // Build the combined where clause with search
  const where = useMemo<ApiFileWhereInput | undefined>(() => {
    const conditions: ApiFileWhereInput[] = [];

    // Add search condition (case-insensitive contains on originalName)
    if (search && search.trim()) {
      conditions.push({
        originalName: { _containsi: search.trim() },
      });
    }

    // Add external filters
    if (externalWhere) {
      conditions.push(externalWhere);
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { _and: conditions };
  }, [search, externalWhere]);

  const { data, loading, error, refetch, fetchMore } =
    useQuery<FilesQueryResponse>(FILES_QUERY, {
      variables: { first, after, where, orderBy },
      skip,
      fetchPolicy: "cache-and-network",
    });

  const files = data?.mediaQuery.files.edges.map((edge) => edge.node) ?? [];
  const pageInfo = data?.mediaQuery.files.pageInfo ?? null;
  const totalCount = data?.mediaQuery.files.totalCount ?? 0;

  const rangeStart = files.length > 0 ? currentPage * first + 1 : 0;
  const rangeEnd = currentPage * first + files.length;

  const fetchNextPage = () => {
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      fetchMore({
        variables: {
          first,
          after: pageInfo.endCursor,
          last: undefined,
          before: undefined,
          where,
          orderBy,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return fetchMoreResult;
        },
      }).then(() => {
        setCurrentPage((p) => p + 1);
      });
    }
  };

  const fetchPreviousPage = () => {
    if (pageInfo?.hasPreviousPage && pageInfo.startCursor) {
      fetchMore({
        variables: {
          first: undefined,
          after: undefined,
          last: first,
          before: pageInfo.startCursor,
          where,
          orderBy,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return fetchMoreResult;
        },
      }).then(() => {
        setCurrentPage((p) => Math.max(0, p - 1));
      });
    }
  };

  return {
    files,
    totalCount,
    pageInfo,
    rangeStart,
    rangeEnd,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
    fetchNextPage,
    fetchPreviousPage,
  };
}
