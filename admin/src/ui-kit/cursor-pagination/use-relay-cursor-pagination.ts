"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiPageInfo } from "@/graphql/types";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface RelayCursorPaginationVariables {
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
}

export interface UseRelayCursorPaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  resetKey?: string | number | boolean | null;
}

export interface UseRelayCursorPaginationReturn {
  pageSize: number;
  pageSizeOptions: number[];
  currentPage: number;
  variables: RelayCursorPaginationVariables;
  setPageSize: (pageSize: number) => void;
  goToNextPage: (pageInfo: ApiPageInfo | null) => void;
  goToPreviousPage: (pageInfo: ApiPageInfo | null) => void;
  resetToFirstPage: () => void;
  getRangeStart: (loadedRowsCount: number, totalCount: number) => number;
  getRangeEnd: (loadedRowsCount: number, totalCount: number) => number;
}

export function useRelayCursorPagination({
  defaultPageSize = 20,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  resetKey = null,
}: UseRelayCursorPaginationOptions = {}): UseRelayCursorPaginationReturn {
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(0);
  const [cursor, setCursor] = useState<{
    after: string | null;
    before: string | null;
  }>({
    after: null,
    before: null,
  });

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(0);
    setCursor({ after: null, before: null });
  }, []);

  useEffect(() => {
    resetToFirstPage();
  }, [resetKey, resetToFirstPage]);

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      setPageSizeState(nextPageSize);
      resetToFirstPage();
    },
    [resetToFirstPage],
  );

  const goToNextPage = useCallback((pageInfo: ApiPageInfo | null) => {
    if (!pageInfo?.endCursor || !pageInfo.hasNextPage) {
      return;
    }

    setCursor({ after: pageInfo.endCursor, before: null });
    setCurrentPage((page) => page + 1);
  }, []);

  const goToPreviousPage = useCallback((pageInfo: ApiPageInfo | null) => {
    if (!pageInfo?.startCursor || !pageInfo.hasPreviousPage) {
      return;
    }

    setCursor({ after: null, before: pageInfo.startCursor });
    setCurrentPage((page) => Math.max(0, page - 1));
  }, []);

  const variables = useMemo<RelayCursorPaginationVariables>(() => {
    if (cursor.before) {
      return {
        first: undefined,
        after: null,
        last: pageSize,
        before: cursor.before,
      };
    }

    return {
      first: pageSize,
      after: cursor.after,
      last: undefined,
      before: null,
    };
  }, [cursor.after, cursor.before, pageSize]);

  const getRangeStart = useCallback(
    (loadedRowsCount: number, totalCount: number) => {
      if (loadedRowsCount === 0 || totalCount === 0) {
        return 0;
      }

      return Math.min(currentPage * pageSize + 1, totalCount);
    },
    [currentPage, pageSize],
  );

  const getRangeEnd = useCallback(
    (loadedRowsCount: number, totalCount: number) => {
      if (loadedRowsCount === 0 || totalCount === 0) {
        return 0;
      }

      return Math.min(currentPage * pageSize + loadedRowsCount, totalCount);
    },
    [currentPage, pageSize],
  );

  return {
    pageSize,
    pageSizeOptions,
    currentPage,
    variables,
    setPageSize,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    getRangeStart,
    getRangeEnd,
  };
}
