"use client";

import type { ApiPageInfo } from "@/graphql/types";
import { CursorPagination } from "./cursor-pagination";
import type { UseRelayCursorPaginationReturn } from "./use-relay-cursor-pagination";

export interface RelayCursorPaginationProps {
  name?: string;
  pagination: UseRelayCursorPaginationReturn;
  pageInfo: ApiPageInfo | null;
  totalCount: number;
  loadedRowsCount: number;
  disabled?: boolean;
  disabledReason?: string;
}

export function RelayCursorPagination({
  name,
  pagination,
  pageInfo,
  totalCount,
  loadedRowsCount,
  disabled = false,
  disabledReason,
}: RelayCursorPaginationProps) {
  return (
    <CursorPagination
      name={name}
      total={totalCount}
      rangeStart={pagination.getRangeStart(loadedRowsCount, totalCount)}
      rangeEnd={pagination.getRangeEnd(loadedRowsCount, totalCount)}
      pageSize={pagination.pageSize}
      pageSizeOptions={pagination.pageSizeOptions}
      hasNext={pageInfo?.hasNextPage ?? false}
      hasPrev={pageInfo?.hasPreviousPage ?? false}
      onNext={() => pagination.goToNextPage(pageInfo)}
      onPrev={() => pagination.goToPreviousPage(pageInfo)}
      onPageSizeChange={pagination.setPageSize}
      disabled={disabled}
      disabledReason={disabledReason}
    />
  );
}
