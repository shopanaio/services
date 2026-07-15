"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Button, Flex, Tag, Typography } from "antd";
import {
  CheckCircleFilled,
  DislikeOutlined,
  FlagOutlined,
  LikeOutlined,
  PictureOutlined,
  PlusOutlined,
  ShoppingOutlined,
  StarFilled,
} from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  AllCommunityModule,
  GridStateModule,
  ModuleRegistry,
  type ColDef,
} from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import { useReviews } from "../hooks";
import { useReviewModal } from "../modals";
import type {
  ApiReview,
  ReviewWhereInput,
} from "../graphql/operation-types";
import {
  ReviewOrderField,
  ReviewStatus,
} from "../graphql/operation-types";
import { filterSchema } from "./filter-schema";
import {
  buildReviewSearchCondition,
  buildReviewsQueryVariables,
  reviewSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const statusConfig: Record<ReviewStatus, { color: string; label: string }> = {
  [ReviewStatus.Pending]: { color: "gold", label: "Pending" },
  [ReviewStatus.Published]: { color: "green", label: "Published" },
  [ReviewStatus.Rejected]: { color: "red", label: "Rejected" },
};

function RatingCell({ value }: CustomCellRendererProps<ApiReview, number>) {
  return (
    <Flex align="center" gap={6}>
      <StarFilled style={{ color: "#f5a623" }} />
      <Typography.Text strong>{value ?? 0}.0</Typography.Text>
    </Flex>
  );
}

function ReviewCell({ data }: CustomCellRendererProps<ApiReview>) {
  if (!data) return null;

  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Typography.Text strong ellipsis title={data.title ?? data.body}>
        {data.title ?? "Untitled review"}
      </Typography.Text>
      <Typography.Text type="secondary" ellipsis title={data.body}>
        {data.body}
      </Typography.Text>
    </Flex>
  );
}

function ProductCell({ data }: CustomCellRendererProps<ApiReview>) {
  if (!data) return null;

  return (
    <Flex align="center" gap="small" style={{ minWidth: 0 }}>
      <ShoppingOutlined style={{ color: "#8c8c8c", fontSize: 18 }} />
      <Typography.Text ellipsis title={data.product.title}>
        {data.product.title}
      </Typography.Text>
    </Flex>
  );
}

function CustomerCell({ data }: CustomCellRendererProps<ApiReview>) {
  if (!data) return null;

  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Typography.Text ellipsis>{data.customer.displayName}</Typography.Text>
      <Typography.Text type="secondary" ellipsis title={data.customer.email}>
        {data.customer.email}
      </Typography.Text>
    </Flex>
  );
}

function StatusCell({ value }: CustomCellRendererProps<ApiReview, ReviewStatus>) {
  const config = statusConfig[value ?? ReviewStatus.Pending];
  return <Tag color={config.color}>{config.label}</Tag>;
}

function VerifiedCell({ value }: CustomCellRendererProps<ApiReview, boolean>) {
  return value ? (
    <Flex align="center" gap={6}>
      <CheckCircleFilled style={{ color: "#52c41a" }} />
      <Typography.Text>Verified</Typography.Text>
    </Flex>
  ) : (
    <Typography.Text type="secondary">Unverified</Typography.Text>
  );
}

function SignalsCell({ data }: CustomCellRendererProps<ApiReview>) {
  if (!data) return null;

  return (
    <Flex gap="middle">
      <Flex align="center" gap={5} title="Likes">
        <LikeOutlined />
        <Typography.Text>{data.likeCount}</Typography.Text>
      </Flex>
      <Flex align="center" gap={5} title="Dislikes">
        <DislikeOutlined />
        <Typography.Text>{data.dislikeCount}</Typography.Text>
      </Flex>
      <Flex align="center" gap={5} title="Reports">
        <FlagOutlined style={{ color: data.reportedCount > 0 ? "#cf1322" : undefined }} />
        <Typography.Text type={data.reportedCount > 0 ? "danger" : undefined}>
          {data.reportedCount}
        </Typography.Text>
      </Flex>
      {data.mediaCount > 0 && (
        <Flex align="center" gap={5} title="Customer media">
          <PictureOutlined />
          <Typography.Text>{data.mediaCount}</Typography.Text>
        </Flex>
      )}
    </Flex>
  );
}

const reviewDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function DateCell({ value }: CustomCellRendererProps<ApiReview, string>) {
  return (
    <Typography.Text>{value ? reviewDateFormatter.format(new Date(value)) : ""}</Typography.Text>
  );
}

export default function CustomerReviewsPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiReview>>(null);
  const pageConfig = usePageConfig<ApiReview, ReviewWhereInput, ReviewOrderField>({
    gridRef,
    storageKey: "reviews-grid-state",
    filterSchema,
    sortFieldMapping: reviewSortFieldMapping,
    defaultSort: [{ colId: "createdAt", sort: "desc" }],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20],
    buildSearchCondition: buildReviewSearchCondition,
  });
  const variables = useMemo(
    () => buildReviewsQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { reviews, totalCount, pageInfo, loading, error, refetch } = useReviews(variables);
  const { push: openReviewModal } = useReviewModal();

  const handleCreateReview = useCallback(() => {
    openReviewModal({ mode: "create", onSaved: refetch });
  }, [openReviewModal, refetch]);

  const handleEditReview = useCallback(
    (review: ApiReview) => {
      openReviewModal({ mode: "edit", entityId: review.id, onSaved: refetch });
    },
    [openReviewModal, refetch],
  );

  const handleNextPage = useCallback(() => {
    if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor);
  }, [pageConfig, pageInfo?.endCursor]);

  const handlePrevPage = useCallback(() => {
    if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor);
  }, [pageConfig, pageInfo?.startCursor]);

  const columnDefs = useMemo<ColDef<ApiReview>[]>(
    () => [
      {
        headerName: "Rating",
        field: "rating",
        cellRenderer: RatingCell,
        width: 105,
      },
      {
        headerName: "Review",
        colId: "review",
        cellRenderer: ReviewCell,
        minWidth: 320,
        flex: 2,
        sortable: false,
      },
      {
        headerName: "Product",
        colId: "product",
        cellRenderer: ProductCell,
        minWidth: 230,
        flex: 1,
        sortable: false,
      },
      {
        headerName: "Customer",
        colId: "customer",
        cellRenderer: CustomerCell,
        minWidth: 210,
        sortable: false,
      },
      {
        headerName: "Status",
        field: "status",
        cellRenderer: StatusCell,
        width: 125,
      },
      {
        headerName: "Purchase",
        field: "isVerifiedPurchase",
        cellRenderer: VerifiedCell,
        width: 135,
      },
      {
        headerName: "Signals",
        colId: "likeCount",
        cellRenderer: SignalsCell,
        minWidth: 210,
      },
      {
        headerName: "Submitted",
        field: "createdAt",
        cellRenderer: DateCell,
        minWidth: 180,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<ApiReview>>(
    () => ({
      resizable: true,
      sortable: true,
      comparator: () => 0,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <DataLayout
      fullWidth
      name="reviews"
      title="Reviews"
      count={totalCount}
      actions={
        <Button icon={<PlusOutlined />} onClick={handleCreateReview}>
          Create review
        </Button>
      }
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search review content..."
          />
        }
      />

      <div
        style={{
          height: "100%",
          paddingBottom: 16,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {error && (
          <Alert
            type="error"
            message={error.message}
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}

        <div style={{ flex: 1 }} data-testid="reviews-table">
          <AgGridReact<ApiReview>
            ref={gridRef}
            theme={agGridTheme}
            rowData={reviews}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={68}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={({ data }) => {
              if (data) handleEditReview(data);
            }}
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>

        <CursorPagination
          name="reviews"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(reviews.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(reviews.length), totalCount)}
          pageSize={pageConfig.pageSize}
          pageSizeOptions={pageConfig.pageSizeOptions}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={handleNextPage}
          onPrev={handlePrevPage}
          onPageSizeChange={pageConfig.setPageSize}
        />
      </div>
    </DataLayout>
  );
}
