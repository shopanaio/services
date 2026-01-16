"use client";

import { useMemo } from "react";
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
   * Number of items for forward pagination.
   */
  first?: number;
  /**
   * Number of items for backward pagination.
   */
  last?: number;
  /**
   * Cursor for forward pagination.
   */
  after?: string | null;
  /**
   * Cursor for backward pagination.
   */
  before?: string | null;
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
    first,
    last,
    after = null,
    before = null,
    skip = false,
    search,
    where: externalWhere,
    orderBy,
  } = options;

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

  const { data, loading, error, refetch } =
    useQuery<FilesQueryResponse>(FILES_QUERY, {
      variables: { first, last, after, before, where, orderBy },
      skip,
      fetchPolicy: "cache-and-network",
    });

  const files = data?.mediaQuery.files.edges.map((edge) => edge.node) ?? [];
  const pageInfo = data?.mediaQuery.files.pageInfo ?? null;
  const totalCount = data?.mediaQuery.files.totalCount ?? 0;

  return {
    files,
    totalCount,
    pageInfo,
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
