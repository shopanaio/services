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
import type { ApiReviewModerationCase, ApiReviewModerationCaseWhereInput } from "@/graphql/types";
import { ReviewModerationCaseOrderField, ReviewModerationCaseStatus } from "@/graphql/types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";
import { useModerationCaseModal } from "../modals";
import { useModerationCases } from "../hooks";
import { filterSchema } from "./filter-schema";
import { buildModerationCaseSearchCondition, buildModerationCasesQueryVariables, moderationCaseSortFieldMapping } from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function ContentCell({ data }: CustomCellRendererProps<ApiReviewModerationCase>) {
  if (!data) return null;
  return <Flex vertical gap={2} style={{ minWidth: 0 }}><Typography.Text ellipsis title={data.content.body}>{data.content.body}</Typography.Text><Typography.Text type="secondary" ellipsis>{data.content.author.displayName}</Typography.Text></Flex>;
}

export default function ModerationCasesPage() {
  const { backToUgc } = useUgcNavigation();
  const theme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiReviewModerationCase>>(null);
  const pageConfig = usePageConfig<ApiReviewModerationCase, ApiReviewModerationCaseWhereInput, ReviewModerationCaseOrderField>({
    gridRef, storageKey: "moderation-cases-grid-state", filterSchema, sortFieldMapping: moderationCaseSortFieldMapping,
    defaultSort: [{ colId: "createdAt", sort: "desc" }], defaultPageSize: 10, pageSizeOptions: [10, 20, 50], buildSearchCondition: buildModerationCaseSearchCondition,
  });
  const variables = useMemo(() => buildModerationCasesQueryVariables(pageConfig), [pageConfig.first, pageConfig.after, pageConfig.last, pageConfig.before, pageConfig.where, pageConfig.orderBy]);
  const { moderationCases, totalCount, pageInfo, loading, error, refetch } = useModerationCases(variables);
  const { push } = useModerationCaseModal();
  const next = useCallback(() => { if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor); }, [pageConfig, pageInfo?.endCursor]);
  const prev = useCallback(() => { if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor); }, [pageConfig, pageInfo?.startCursor]);
  const columnDefs = useMemo<ColDef<ApiReviewModerationCase>[]>(() => [
    { headerName: "Content", colId: "content", cellRenderer: ContentCell, minWidth: 340, flex: 2, sortable: false },
    { headerName: "Reason", field: "reasonCode", minWidth: 180 },
    { headerName: "Priority", field: "priority", width: 105 },
    { headerName: "Status", field: "status", width: 130, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewModerationCase, ReviewModerationCaseStatus>) => <Tag color={value === ReviewModerationCaseStatus.Open ? "gold" : value === ReviewModerationCaseStatus.Resolved ? "green" : value === ReviewModerationCaseStatus.InReview ? "blue" : undefined}>{String(value).toLowerCase().replaceAll("_", " ")}</Tag> },
    { headerName: "Assignee", field: "assignedToPrincipalId", minWidth: 180, valueFormatter: ({ value }) => value ?? "Unassigned" },
    { headerName: "Due", field: "dueAt", minWidth: 180, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewModerationCase, string>) => <Typography.Text>{value ? dateFormatter.format(new Date(value)) : "—"}</Typography.Text> },
    { headerName: "Created", field: "createdAt", minWidth: 180, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewModerationCase, string>) => <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text> },
  ], []);
  const defaultColDef = useMemo<ColDef<ApiReviewModerationCase>>(() => ({ resizable: true, sortable: true, comparator: () => 0, cellStyle: { display: "flex", alignItems: "center" } }), []);

  return <DataLayout fullWidth name="moderation-cases" title="Moderation cases" count={totalCount} onBack={backToUgc} actions={<Button icon={<PlusOutlined />} onClick={() => push({ onSaved: refetch })}>Create moderation case</Button>}>
    <DataLayout.Toolbar left={<FilterWidget {...pageConfig.filterWidgetProps} searchPlaceholder="Search case details..." />} />
    <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
      {error ? <Alert type="error" showIcon message={error.message} style={{ marginBottom: 12 }} /> : null}
      <div style={{ flex: 1 }} data-testid="moderation-cases-table"><AgGridReact<ApiReviewModerationCase> ref={gridRef} theme={theme} rowData={moderationCases} loading={loading} columnDefs={columnDefs} defaultColDef={defaultColDef} getRowId={({ data }) => data.id} rowHeight={68} suppressCellFocus suppressMovableColumns rowStyle={{ cursor: "pointer" }} onRowClicked={({ data }) => data && push({ moderationCase: data, onSaved: refetch })} onSortChanged={pageConfig.onSortChanged} initialState={pageConfig.gridStateProps.initialState} onStateUpdated={pageConfig.gridStateProps.onStateUpdated} /></div>
      <CursorPagination name="moderation cases" total={totalCount} rangeStart={pageConfig.getRangeStart(moderationCases.length)} rangeEnd={Math.min(pageConfig.getRangeEnd(moderationCases.length), totalCount)} pageSize={pageConfig.pageSize} pageSizeOptions={pageConfig.pageSizeOptions} hasNext={pageInfo?.hasNextPage ?? false} hasPrev={pageInfo?.hasPreviousPage ?? false} onNext={next} onPrev={prev} onPageSizeChange={pageConfig.setPageSize} />
    </div>
  </DataLayout>;
}
