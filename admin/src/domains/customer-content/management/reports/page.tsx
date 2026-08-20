"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Flex, Input, Modal, Select, Tag, Typography } from "antd";
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
import type { ApiReviewContentReport, ApiReviewContentReportWhereInput } from "@/graphql/types";
import { ReviewContentReportOrderField, ReviewContentReportStatus } from "@/graphql/types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";
import { useContentReports, useManagementMutations } from "../hooks";
import { filterSchema } from "./filter-schema";
import {
  buildReportSearchCondition,
  buildReportsQueryVariables,
  reportSortFieldMapping,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
function ContentCell({ data }: CustomCellRendererProps<ApiReviewContentReport>) {
  if (!data) return null;
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Typography.Text ellipsis title={data.content.body}>
        {data.content.body}
      </Typography.Text>
      <Typography.Text type="secondary" ellipsis>
        {data.content.author.displayName}
      </Typography.Text>
    </Flex>
  );
}

export default function ContentReportsPage() {
  const { backToUgc } = useUgcNavigation();
  const { message } = App.useApp();
  const theme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiReviewContentReport>>(null);
  const pageConfig = usePageConfig<
    ApiReviewContentReport,
    ApiReviewContentReportWhereInput,
    ReviewContentReportOrderField
  >({
    gridRef,
    storageKey: "content-reports-grid-state",
    filterSchema,
    sortFieldMapping: reportSortFieldMapping,
    defaultSort: [{ colId: "createdAt", sort: "desc" }],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    buildSearchCondition: buildReportSearchCondition,
  });
  const variables = useMemo(
    () => buildReportsQueryVariables(pageConfig),
    [
      pageConfig.first,
      pageConfig.after,
      pageConfig.last,
      pageConfig.before,
      pageConfig.where,
      pageConfig.orderBy,
    ],
  );
  const { reports, totalCount, pageInfo, loading, error, refetch } = useContentReports(variables);
  const mutations = useManagementMutations();
  const [selected, setSelected] = useState<ApiReviewContentReport | null>(null);
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<ReviewContentReportStatus | undefined>();
  const [note, setNote] = useState("");
  const openReport = useCallback((report: ApiReviewContentReport) => {
    setSelected(report);
    setAssignee(report.assignedToPrincipalId ?? "");
    setStatus(
      [ReviewContentReportStatus.Actioned, ReviewContentReportStatus.Dismissed].includes(
        report.status,
      )
        ? report.status
        : undefined,
    );
    setNote(report.resolutionNote ?? "");
  }, []);
  const save = useCallback(async () => {
    if (!selected) return;
    const result = await mutations.updateReport(selected.id, selected.updatedAt, {
      assignment: { assignedToPrincipalId: assignee.trim() || null },
      resolution: status ? { status, note: note.trim() || null } : undefined,
    });
    if (result.errors.length)
      return message.error(result.errors.map((item) => item.message).join(" "));
    await refetch();
    setSelected(null);
    message.success("Report updated");
  }, [assignee, message, mutations, note, refetch, selected, status]);
  const next = useCallback(() => {
    if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor);
  }, [pageConfig, pageInfo?.endCursor]);
  const prev = useCallback(() => {
    if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor);
  }, [pageConfig, pageInfo?.startCursor]);
  const columnDefs = useMemo<ColDef<ApiReviewContentReport>[]>(
    () => [
      {
        headerName: "Reported content",
        colId: "content",
        cellRenderer: ContentCell,
        minWidth: 360,
        flex: 2,
        sortable: false,
      },
      {
        headerName: "Reason",
        field: "reason",
        minWidth: 180,
        valueFormatter: ({ value }) => String(value).toLowerCase().replaceAll("_", " "),
      },
      {
        headerName: "Reporter",
        colId: "reporterCustomerId",
        minWidth: 180,
        valueGetter: ({ data }) => data?.reporterCustomer?.displayName ?? "Anonymous",
      },
      {
        headerName: "Status",
        field: "status",
        width: 130,
        cellRenderer: ({
          value,
        }: CustomCellRendererProps<ApiReviewContentReport, ReviewContentReportStatus>) => (
          <Tag
            color={
              value === ReviewContentReportStatus.Open
                ? "gold"
                : value === ReviewContentReportStatus.Actioned
                  ? "green"
                  : value === ReviewContentReportStatus.UnderReview
                    ? "blue"
                    : undefined
            }
          >
            {String(value).toLowerCase().replaceAll("_", " ")}
          </Tag>
        ),
      },
      {
        headerName: "Assignee",
        field: "assignedToPrincipalId",
        minWidth: 180,
        valueFormatter: ({ value }) => value ?? "Unassigned",
      },
      {
        headerName: "Created",
        field: "createdAt",
        minWidth: 180,
        cellRenderer: ({ value }: CustomCellRendererProps<ApiReviewContentReport, string>) => (
          <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text>
        ),
      },
    ],
    [],
  );
  const defaultColDef = useMemo<ColDef<ApiReviewContentReport>>(
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
      name="content-reports"
      title="Content reports"
      count={totalCount}
      onBack={backToUgc}
    >
      <DataLayout.Toolbar
        left={
          <FilterWidget
            {...pageConfig.filterWidgetProps}
            searchPlaceholder="Search principal IDs..."
          />
        }
      />
      <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
        {error ? (
          <Alert type="error" showIcon message={error.message} style={{ marginBottom: 12 }} />
        ) : null}
        <div style={{ flex: 1 }} data-testid="content-reports-table">
          <AgGridReact<ApiReviewContentReport>
            ref={gridRef}
            theme={theme}
            rowData={reports}
            loading={loading}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={({ data }) => data.id}
            rowHeight={68}
            suppressCellFocus
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={({ data }) => data && openReport(data)}
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>
        <CursorPagination
          name="content reports"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(reports.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(reports.length), totalCount)}
          pageSize={pageConfig.pageSize}
          pageSizeOptions={pageConfig.pageSizeOptions}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={next}
          onPrev={prev}
          onPageSizeChange={pageConfig.setPageSize}
        />
      </div>
      <Modal
        title="Content report"
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={
          <Flex justify="flex-end" gap="small">
            <Button onClick={() => setSelected(null)}>Cancel</Button>
            <Button type="primary" loading={mutations.loading} onClick={save}>
              Save
            </Button>
          </Flex>
        }
      >
        <Flex vertical gap="middle">
          <Alert type="info" message={selected?.details || "No reporter details"} />
          <div>
            <Typography.Text strong>Assigned principal</Typography.Text>
            <Input
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Typography.Text strong>Resolution</Typography.Text>
            <Select
              allowClear
              value={status}
              placeholder="Keep open"
              options={[
                ReviewContentReportStatus.Actioned,
                ReviewContentReportStatus.Dismissed,
              ].map((value) => ({ value, label: value.toLowerCase() }))}
              onChange={setStatus}
              style={{ width: "100%", marginTop: 8 }}
            />
          </div>
          <div>
            <Typography.Text strong>Resolution note</Typography.Text>
            <Input.TextArea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              style={{ marginTop: 8 }}
            />
          </div>
        </Flex>
      </Modal>
    </DataLayout>
  );
}
