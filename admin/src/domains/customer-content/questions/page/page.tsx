"use client";

import { useCallback, useMemo, useRef } from "react";
import { Alert, Button, Flex, Tag, Typography } from "antd";
import {
  DislikeOutlined,
  FlagOutlined,
  LikeOutlined,
  MessageOutlined,
  PlusOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import { AgGridReact } from "ag-grid-react";
import type { CustomCellRendererProps } from "ag-grid-react";
import { AllCommunityModule, GridStateModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { FilterWidget } from "@/layouts/filters";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { useAgGridTheme, usePageConfig } from "@/hooks";
import { useQuestions } from "../hooks";
import { useQuestionModal } from "../modals";
import type { ApiQuestion, QuestionWhereInput } from "../graphql/operation-types";
import { QuestionAnswerState, QuestionOrderField, QuestionStatus } from "../graphql/operation-types";
import { filterSchema } from "./filter-schema";
import { buildQuestionSearchCondition, buildQuestionsQueryVariables, questionSortFieldMapping } from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const statusConfig: Record<QuestionStatus, { color: string; label: string }> = {
  [QuestionStatus.Pending]: { color: "gold", label: "Pending" },
  [QuestionStatus.Published]: { color: "green", label: "Published" },
  [QuestionStatus.Rejected]: { color: "red", label: "Rejected" },
};

function QuestionCell({ data }: CustomCellRendererProps<ApiQuestion>) {
  if (!data) return null;
  return <Typography.Text ellipsis title={data.body}>{data.body}</Typography.Text>;
}

function ProductCell({ data }: CustomCellRendererProps<ApiQuestion>) {
  if (!data) return null;
  return (
    <Flex align="center" gap="small" style={{ minWidth: 0 }}>
      <ShoppingOutlined style={{ color: "#8c8c8c", fontSize: 18 }} />
      <Typography.Text ellipsis title={data.product.title}>{data.product.title}</Typography.Text>
    </Flex>
  );
}

function CustomerCell({ data }: CustomCellRendererProps<ApiQuestion>) {
  if (!data) return null;
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Typography.Text ellipsis>{data.customer.displayName}</Typography.Text>
      <Typography.Text type="secondary" ellipsis title={data.customer.email}>{data.customer.email}</Typography.Text>
    </Flex>
  );
}

function AnswerCell({ data }: CustomCellRendererProps<ApiQuestion>) {
  if (!data) return null;
  const answered = data.answerState === QuestionAnswerState.Answered;
  return (
    <Flex align="center" gap={6}>
      <MessageOutlined style={{ color: answered ? "#52c41a" : "#faad14" }} />
      <Typography.Text>{answered ? `${data.answerCount} answered` : "Unanswered"}</Typography.Text>
    </Flex>
  );
}

function StatusCell({ value }: CustomCellRendererProps<ApiQuestion, QuestionStatus>) {
  const config = statusConfig[value ?? QuestionStatus.Pending];
  return <Tag color={config.color}>{config.label}</Tag>;
}

function SignalsCell({ data }: CustomCellRendererProps<ApiQuestion>) {
  if (!data) return null;
  return (
    <Flex gap="middle">
      <Flex align="center" gap={5} title="Likes"><LikeOutlined /><Typography.Text>{data.likeCount}</Typography.Text></Flex>
      <Flex align="center" gap={5} title="Dislikes"><DislikeOutlined /><Typography.Text>{data.dislikeCount}</Typography.Text></Flex>
      <Flex align="center" gap={5} title="Abuse reports">
        <FlagOutlined style={{ color: data.reportedCount ? "#cf1322" : undefined }} />
        <Typography.Text type={data.reportedCount ? "danger" : undefined}>{data.reportedCount}</Typography.Text>
      </Flex>
    </Flex>
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
function DateCell({ value }: CustomCellRendererProps<ApiQuestion, string>) {
  return <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text>;
}

export default function CustomerQuestionsPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<ApiQuestion>>(null);
  const pageConfig = usePageConfig<ApiQuestion, QuestionWhereInput, QuestionOrderField>({
    gridRef,
    storageKey: "questions-grid-state",
    filterSchema,
    sortFieldMapping: questionSortFieldMapping,
    defaultSort: [{ colId: "createdAt", sort: "desc" }],
    defaultPageSize: 10,
    pageSizeOptions: [10, 20],
    buildSearchCondition: buildQuestionSearchCondition,
  });
  const variables = useMemo(() => buildQuestionsQueryVariables(pageConfig), [pageConfig.first, pageConfig.after, pageConfig.last, pageConfig.before, pageConfig.where, pageConfig.orderBy]);
  const { questions, totalCount, pageInfo, loading, error, refetch } = useQuestions(variables);
  const { push: openQuestionModal } = useQuestionModal();
  const createQuestion = useCallback(() => openQuestionModal({ mode: "create", onSaved: refetch }), [openQuestionModal, refetch]);
  const editQuestion = useCallback((question: ApiQuestion) => openQuestionModal({ mode: "edit", entityId: question.id, onSaved: refetch }), [openQuestionModal, refetch]);
  const nextPage = useCallback(() => { if (pageInfo?.endCursor) pageConfig.goToNextPage(pageInfo.endCursor); }, [pageConfig, pageInfo?.endCursor]);
  const previousPage = useCallback(() => { if (pageInfo?.startCursor) pageConfig.goToPrevPage(pageInfo.startCursor); }, [pageConfig, pageInfo?.startCursor]);

  const columnDefs = useMemo<ColDef<ApiQuestion>[]>(() => [
    { headerName: "Question", field: "body", cellRenderer: QuestionCell, minWidth: 340, flex: 2, sortable: false },
    { headerName: "Product", colId: "product", cellRenderer: ProductCell, minWidth: 230, flex: 1, sortable: false },
    { headerName: "Customer", colId: "customer", cellRenderer: CustomerCell, minWidth: 210, sortable: false },
    { headerName: "Answers", field: "answerCount", cellRenderer: AnswerCell, minWidth: 145 },
    { headerName: "Status", field: "status", cellRenderer: StatusCell, width: 125 },
    { headerName: "Signals", colId: "likeCount", cellRenderer: SignalsCell, minWidth: 210 },
    { headerName: "Submitted", field: "createdAt", cellRenderer: DateCell, minWidth: 180 },
  ], []);
  const defaultColDef = useMemo<ColDef<ApiQuestion>>(() => ({ resizable: true, sortable: true, comparator: () => 0, cellStyle: { display: "flex", alignItems: "center" } }), []);

  return (
    <DataLayout fullWidth name="questions" title="Questions" count={totalCount} actions={<Button icon={<PlusOutlined />} onClick={createQuestion}>Create question</Button>}>
      <DataLayout.Toolbar left={<FilterWidget {...pageConfig.filterWidgetProps} searchPlaceholder="Search questions..." />} />
      <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
        {error ? <Alert type="error" message={error.message} showIcon style={{ marginBottom: 12 }} /> : null}
        <div style={{ flex: 1 }} data-testid="questions-table">
          <AgGridReact<ApiQuestion>
            ref={gridRef}
            theme={agGridTheme}
            rowData={questions}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) => params.data.id}
            rowHeight={68}
            loading={loading}
            suppressMovableColumns
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={({ data }) => data && editQuestion(data)}
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
            suppressCellFocus
          />
        </div>
        <CursorPagination
          name="questions"
          total={totalCount}
          rangeStart={pageConfig.getRangeStart(questions.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(questions.length), totalCount)}
          pageSize={pageConfig.pageSize}
          pageSizeOptions={pageConfig.pageSizeOptions}
          hasNext={pageInfo?.hasNextPage ?? false}
          hasPrev={pageInfo?.hasPreviousPage ?? false}
          onNext={nextPage}
          onPrev={previousPage}
          onPageSizeChange={pageConfig.setPageSize}
        />
      </div>
    </DataLayout>
  );
}
