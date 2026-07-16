"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, App, Button, Flex, Tag, Typography } from "antd";
import { LuFolderPlus as FolderAddOutlined, LuBan as StopOutlined } from "react-icons/lu";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import { AllCommunityModule, GridStateModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import type { ApiReviewContent, ApiReviewContentWhereInput } from "@/graphql/types";
import { ReviewContentKind, ReviewContentOrderField, ReviewContentStatus } from "@/graphql/types";
import { useReviewModal } from "@/domains/customer-content/reviews/modals";
import { useQuestionModal } from "@/domains/customer-content/questions/modals";
import { useContentActions } from "@/domains/customer-content/shared/hooks";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";
import { useModerationContents } from "../hooks";
import { useModerationCaseModal } from "../modals";
import { filterSchema } from "./filter-schema";
import { buildModerationQueryVariables, buildModerationSearchCondition, moderationSortFieldMapping } from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function ContentCell({ data }: CustomCellRendererProps<ApiReviewContent>) {
  if (!data) return null;
  return <Flex vertical gap={2} style={{ minWidth: 0 }}><Typography.Text strong ellipsis>{data.title || data.kind.toLowerCase().replaceAll("_", " ")}</Typography.Text><Typography.Text type="secondary" ellipsis title={data.body}>{data.body}</Typography.Text></Flex>;
}

export default function ModerationQueuePage() {
  const { backToUgc } = useUgcNavigation();
  const { message, modal } = App.useApp();
  const theme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiReviewContent>>(null);
  const pageConfig = usePageConfig<ApiReviewContent, ApiReviewContentWhereInput, ReviewContentOrderField>({
    gridRef, storageKey: "moderation-grid-state", filterSchema, sortFieldMapping: moderationSortFieldMapping,
    defaultSort: [{ colId: "updatedAt", sort: "desc" }], defaultPageSize: 10, pageSizeOptions: [10, 20, 50], buildSearchCondition: buildModerationSearchCondition,
  });
  const variables = useMemo(() => buildModerationQueryVariables(pageConfig), [pageConfig.first, pageConfig.after, pageConfig.last, pageConfig.before, pageConfig.where, pageConfig.orderBy]);
  const { contents, totalCount, pageInfo, loading, error, refetch } = useModerationContents(variables);
  const actions = useContentActions();
  const reviewModal = useReviewModal();
  const questionModal = useQuestionModal();
  const caseModal = useModerationCaseModal();

  const open = useCallback((content: ApiReviewContent) => {
    if (content.kind === ReviewContentKind.Review) reviewModal.push({ entityId: content.id, onSaved: refetch });
    if (content.kind === ReviewContentKind.ProductQuestion) questionModal.push({ entityId: content.id, onSaved: refetch });
  }, [questionModal, refetch, reviewModal]);
  const redact = useCallback(async (content: ApiReviewContent) => {
    const confirmed = await modal.confirm({ title: "Redact content?", content: "Personal content will be irreversibly redacted.", okText: "Redact", okButtonProps: { danger: true } });
    if (!confirmed) return;
    const result = await actions.redact(content.id, content.revision);
    if (result.errors.length) return message.error(result.errors.map((item) => item.message).join(" "));
    await refetch(); message.success("Content redacted");
  }, [actions, message, modal, refetch]);
  const next = useCallback(() => { if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor); }, [pageConfig, pageInfo?.endCursor]);
  const prev = useCallback(() => { if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor); }, [pageConfig, pageInfo?.startCursor]);

  const columnDefs = useMemo<ColDef<ApiReviewContent>[]>(() => [
    { headerName: "Content", colId: "title", cellRenderer: ContentCell, minWidth: 340, flex: 2 },
    { headerName: "Type", field: "kind", width: 150, valueFormatter: ({ value }) => String(value).toLowerCase().replaceAll("_", " ") },
    { headerName: "Author", colId: "authorDisplayName", minWidth: 180, valueGetter: ({ data }) => data?.author.displayName },
    { headerName: "Locale", field: "locale", width: 105 },
    { headerName: "Status", field: "status", width: 125, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewContent, ReviewContentStatus>) => <Tag color={value === ReviewContentStatus.Published ? "green" : value === ReviewContentStatus.Rejected ? "red" : "gold"}>{String(value).toLowerCase()}</Tag> },
    { headerName: "Reports", colId: "reportCount", width: 105, valueGetter: ({ data }) => data?.metrics.reportCount ?? 0 },
    { headerName: "Updated", field: "updatedAt", minWidth: 180, cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewContent, string>) => <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text> },
    { headerName: "Actions", colId: "actions", width: 190, sortable: false, cellRenderer: ({ data }: CustomCellRendererProps<ApiReviewContent>) => data ? <Flex gap="small"><Button size="small" icon={<FolderAddOutlined />} onClick={(event) => { event.stopPropagation(); caseModal.push({ contentId: data.id, onSaved: refetch }); }}>Case</Button><Button size="small" danger icon={<StopOutlined />} disabled={!!data.redactedAt} onClick={(event) => { event.stopPropagation(); void redact(data); }}>Redact</Button></Flex> : null },
  ], [caseModal, redact, refetch]);
  const defaultColDef = useMemo<ColDef<ApiReviewContent>>(() => ({ resizable: true, sortable: true, comparator: () => 0, cellStyle: { display: "flex", alignItems: "center" } }), []);

  return <DataLayout fullWidth name="moderation" title="Moderation" count={totalCount} onBack={backToUgc}>
    <DataLayout.Toolbar left={<FilterWidget {...pageConfig.filterWidgetProps} searchPlaceholder="Search moderated content..." />} />
    <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
      {error || actions.error ? <Alert type="error" showIcon message={(error ?? actions.error)?.message} style={{ marginBottom: 12 }} /> : null}
      <div style={{ flex: 1 }} data-testid="moderation-table"><AgGridReact<ApiReviewContent> ref={gridRef} theme={theme} rowData={contents} loading={loading || actions.loading} columnDefs={columnDefs} defaultColDef={defaultColDef} getRowId={({ data }) => data.id} rowHeight={68} suppressCellFocus suppressMovableColumns rowStyle={{ cursor: "pointer" }} onRowClicked={({ data }) => data && open(data)} onSortChanged={pageConfig.onSortChanged} initialState={pageConfig.gridStateProps.initialState} onStateUpdated={pageConfig.gridStateProps.onStateUpdated} /></div>
      <CursorPagination name="moderation" total={totalCount} rangeStart={pageConfig.getRangeStart(contents.length)} rangeEnd={Math.min(pageConfig.getRangeEnd(contents.length), totalCount)} pageSize={pageConfig.pageSize} pageSizeOptions={pageConfig.pageSizeOptions} hasNext={pageInfo?.hasNextPage ?? false} hasPrev={pageInfo?.hasPreviousPage ?? false} onNext={next} onPrev={prev} onPageSizeChange={pageConfig.setPageSize} />
    </div>
  </DataLayout>;
}
