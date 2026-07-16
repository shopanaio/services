"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, Button, Flex, Input, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";
import { DataLayout } from "@/layouts/data";
import { useAgGridTheme } from "@/hooks";
import { CursorPagination } from "@/ui-kit/cursor-pagination";
import { CustomerGroupOrderField, SortDirection, type ApiCustomerGroup } from "@/graphql/types";
import { useCustomerGroups } from "../hooks";
import { useCustomerGroupModal } from "../modals";

ModuleRegistry.registerModules([AllCommunityModule]);

function NameCell({ data }: CustomCellRendererProps<ApiCustomerGroup>) { return data ? <Flex vertical><Typography.Text strong>{data.name}</Typography.Text><Typography.Text type="secondary">{data.code}</Typography.Text></Flex> : null; }
function StateCell({ data }: CustomCellRendererProps<ApiCustomerGroup>) { return data ? <Flex gap={4}>{<Tag color={data.isActive ? "green" : undefined}>{data.isActive ? "Active" : "Inactive"}</Tag>}{data.isDefault ? <Tag color="blue">Default</Tag> : null}</Flex> : null; }

export default function CustomerGroupsPage() {
  const theme = useAgGridTheme();
  const [search, setSearch] = useState("");
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [page, setPage] = useState(0);
  const variables = useMemo(() => ({ first: 20, after: cursorHistory[page], where: search ? { _or: [{ name: { _containsi: search } }, { code: { _containsi: search } }] } : null, orderBy: [{ field: CustomerGroupOrderField.Name, direction: SortDirection.Asc }] }), [cursorHistory, page, search]);
  const query = useCustomerGroups(variables);
  const { push } = useCustomerGroupModal();
  const openCreate = useCallback(() => push({ mode: "create", onSaved: query.refetch }), [push, query.refetch]);
  const openEdit = useCallback((group: ApiCustomerGroup) => push({ mode: "edit", entityId: group.id, onSaved: query.refetch }), [push, query.refetch]);
  const columns = useMemo<ColDef<ApiCustomerGroup>[]>(() => [
    { headerName: "Group", cellRenderer: NameCell, minWidth: 260, flex: 2 },
    { headerName: "State", cellRenderer: StateCell, minWidth: 180 },
    { headerName: "Customers", field: "customersCount", width: 130 },
    { headerName: "Updated", field: "updatedAt", valueFormatter: ({ value }) => value ? new Date(value).toLocaleDateString() : "", width: 150 },
  ], []);
  return <DataLayout fullWidth name="customer-groups" title="Customer groups" count={query.totalCount} actions={<Button icon={<PlusOutlined />} onClick={openCreate}>Create group</Button>}>
    <DataLayout.Toolbar left={<Input.Search allowClear placeholder="Search groups..." onSearch={(value) => { setSearch(value.trim()); setPage(0); setCursorHistory([null]); }} style={{ width: 320 }} />} />
    <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column" }}>
      {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}
      <div style={{ flex: 1 }} data-testid="customer-groups-table"><AgGridReact<ApiCustomerGroup> theme={theme} rowData={query.groups} loading={query.loading} columnDefs={columns} getRowId={({ data }) => data.id} rowHeight={58} suppressCellFocus onRowClicked={({ data }) => data && openEdit(data)} rowStyle={{ cursor: "pointer" }} /></div>
      <CursorPagination name="customer-groups" total={query.totalCount} rangeStart={page * 20 + (query.groups.length ? 1 : 0)} rangeEnd={page * 20 + query.groups.length} pageSize={20} pageSizeOptions={[20]} hasNext={query.pageInfo?.hasNextPage ?? false} hasPrev={page > 0} onNext={() => { const cursor = query.pageInfo?.endCursor; if (!cursor) return; setCursorHistory((items) => [...items.slice(0, page + 1), cursor]); setPage((value) => value + 1); }} onPrev={() => setPage((value) => Math.max(0, value - 1))} onPageSizeChange={() => undefined} />
    </div>
  </DataLayout>;
}
