"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Button, Flex, Tag, Typography } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import { AllCommunityModule, GridStateModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import type { ApiReviewRequest, ApiReviewRequestWhereInput } from "@/graphql/types";
import { ReviewRequestOrderField, ReviewRequestStatus } from "@/graphql/types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";
import { useReviewRequestModal } from "../modals";
import { useReviewRequests } from "../hooks";
import { filterSchema } from "./filter-schema";
import { buildReviewRequestSearchCondition, buildReviewRequestsQueryVariables, reviewRequestSortFieldMapping } from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function CustomerCell({ data }: CustomCellRendererProps<ApiReviewRequest>) {
  if (!data) return null;
  return <Flex vertical gap={2} style={{ minWidth: 0 }}><Typography.Text strong ellipsis>{data.customer.displayName}</Typography.Text><Typography.Text type="secondary" ellipsis>{data.customer.email ?? data.customer.id}</Typography.Text></Flex>;
}
function ProductCell({ data }: CustomCellRendererProps<ApiReviewRequest>) {
  if (!data) return null;
  return <Flex vertical gap={2} style={{ minWidth: 0 }}><Typography.Text ellipsis>{data.product.title}</Typography.Text><Typography.Text type="secondary" ellipsis>Order {data.orderId}</Typography.Text></Flex>;
}

export default function ReviewRequestsPage() {
  const { backToUgc } = useUgcNavigation();
  const theme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiReviewRequest>>(null);
  const pageConfig = usePageConfig<ApiReviewRequest, ApiReviewRequestWhereInput, ReviewRequestOrderField>({
    gridRef, storageKey: "review-requests-grid-state", filterSchema, sortFieldMapping: reviewRequestSortFieldMapping,
    defaultSort: [{ colId: "createdAt", sort: "desc" }], defaultPageSize: 10, pageSizeOptions: [10, 20, 50], buildSearchCondition: buildReviewRequestSearchCondition,
  });
  const variables = useMemo(() => buildReviewRequestsQueryVariables(pageConfig), [pageConfig.first, pageConfig.after, pageConfig.last, pageConfig.before, pageConfig.where, pageConfig.orderBy]);
  const { reviewRequests, totalCount, pageInfo, loading, error, refetch } = useReviewRequests(variables);
  const { push } = useReviewRequestModal();
  const next = useCallback(() => { if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor); }, [pageConfig, pageInfo?.endCursor]);
  const prev = useCallback(() => { if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor); }, [pageConfig, pageInfo?.startCursor]);
  const columnDefs = useMemo<ColDef<ApiReviewRequest>[]>(() => [
    { headerName: "Customer", colId: "customer", cellRenderer: CustomerCell, minWidth: 220, flex: 1, sortable: false },
    { headerName: "Product", colId: "product", cellRenderer: ProductCell, minWidth: 250, flex: 1, sortable: false },
    { headerName: "Channel", field: "channel", width: 125, valueFormatter: ({ value }) => String(value).toLowerCase().replaceAll("_", " ") },
    { headerName: "Status", field: "status", width: 130, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewRequest, ReviewRequestStatus>) => <Tag color={value === ReviewRequestStatus.Submitted ? "green" : value === ReviewRequestStatus.Failed ? "red" : value === ReviewRequestStatus.Scheduled ? "gold" : "blue"}>{String(value).toLowerCase()}</Tag> },
    { headerName: "Locale", field: "locale", width: 105 },
    { headerName: "Scheduled", field: "scheduledAt", minWidth: 180, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewRequest, string>) => <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text> },
    { headerName: "Attempts", field: "attemptCount", width: 105 },
    { headerName: "Created", field: "createdAt", minWidth: 180, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewRequest, string>) => <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text> },
  ], []);
  const defaultColDef = useMemo<ColDef<ApiReviewRequest>>(() => ({ resizable: true, sortable: true, comparator: () => 0, cellStyle: { display: "flex", alignItems: "center" } }), []);

  return <DataLayout fullWidth name="review-requests" title="Review requests" count={totalCount} onBack={backToUgc} actions={<Button icon={<PlusOutlined />} onClick={() => push({ onSaved: refetch })}>Create request</Button>}>
    <DataLayout.Toolbar left={<FilterWidget {...pageConfig.filterWidgetProps} searchPlaceholder="Search request delivery details..." />} />
    <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
      {error ? <Alert type="error" showIcon message={error.message} style={{ marginBottom: 12 }} /> : null}
      <div style={{ flex: 1 }} data-testid="review-requests-table"><AgGridReact<ApiReviewRequest> ref={gridRef} theme={theme} rowData={reviewRequests} loading={loading} columnDefs={columnDefs} defaultColDef={defaultColDef} getRowId={({ data }) => data.id} rowHeight={68} suppressCellFocus suppressMovableColumns rowStyle={{ cursor: "pointer" }} onRowClicked={({ data }) => data && push({ reviewRequest: data, onSaved: refetch })} onSortChanged={pageConfig.onSortChanged} initialState={pageConfig.gridStateProps.initialState} onStateUpdated={pageConfig.gridStateProps.onStateUpdated} /></div>
      <CursorPagination name="review requests" total={totalCount} rangeStart={pageConfig.getRangeStart(reviewRequests.length)} rangeEnd={Math.min(pageConfig.getRangeEnd(reviewRequests.length), totalCount)} pageSize={pageConfig.pageSize} pageSizeOptions={pageConfig.pageSizeOptions} hasNext={pageInfo?.hasNextPage ?? false} hasPrev={pageInfo?.hasPreviousPage ?? false} onNext={next} onPrev={prev} onPageSizeChange={pageConfig.setPageSize} />
    </div>
  </DataLayout>;
}
