"use client";

import { Button, Typography } from "antd";
import type { ApiPageInfo } from "@/graphql/types";
import { useListingPreviewStyles } from "./listing-preview-modal.styles";

interface ListingPreviewPaginationProps {
  pageInfo: ApiPageInfo | null;
  pageIndex: number;
  loadedCount: number;
  totalCount: number;
  loading?: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export const ListingPreviewPagination = ({
  pageInfo,
  pageIndex,
  loadedCount,
  totalCount,
  loading,
  onNext,
  onPrevious,
}: ListingPreviewPaginationProps) => {
  const { styles } = useListingPreviewStyles();

  return (
    <div className={styles.pagination}>
      <Button
        onClick={onPrevious}
        disabled={pageIndex <= 1 || loading}
        data-testid="category-listing-preview-pagination-prev"
      >
        Previous
      </Button>
      <Typography.Text type="secondary">
        Page {pageIndex} · {loadedCount} of {totalCount} loaded
      </Typography.Text>
      <Button
        onClick={onNext}
        disabled={!pageInfo?.hasNextPage || loading}
        data-testid="category-listing-preview-pagination-next"
      >
        Next
      </Button>
    </div>
  );
};
