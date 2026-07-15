"use client";

import { useCallback, useMemo, useRef } from "react";
import { App, Button, Flex, Tag, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
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
import { useNavigationMenuModal } from "../modals";
import { useNavigationStore } from "../store/navigation-store";
import type { NavigationMenu, NavigationMenuItem, NavigationStatus } from "../types";
import { navigationFilterSchema } from "./filter-schema";
import {
  buildNavigationSearchCondition,
  navigationSortFieldMapping,
  type NavigationOrderField,
  type NavigationWhereInput,
} from "./page-config";

ModuleRegistry.registerModules([AllCommunityModule, GridStateModule]);

const statusConfig: Record<NavigationStatus, { color: string; label: string }> = {
  DRAFT: { color: "default", label: "Draft" },
  ACTIVE: { color: "green", label: "Active" },
  ARCHIVED: { color: "red", label: "Archived" },
};

const flattenItems = (items: NavigationMenuItem[]): NavigationMenuItem[] =>
  items.flatMap((item) => [item, ...flattenItems(item.children)]);

function TitleCell({ data }: CustomCellRendererProps<NavigationMenu>) {
  if (!data) return null;
  return <Typography.Text strong>{data.title}</Typography.Text>;
}

function StatusCell({ value }: CustomCellRendererProps<NavigationMenu, NavigationStatus>) {
  const status = statusConfig[value ?? "DRAFT"];
  return <Tag color={status.color}>{status.label}</Tag>;
}

function LinksCell({ data }: CustomCellRendererProps<NavigationMenu>) {
  if (!data) return null;
  const links = flattenItems(data.items);
  return (
    <Flex gap={4} align="center" style={{ minWidth: 0, overflow: "hidden" }}>
      {links.slice(0, 3).map((item) => <Tag key={item.id}>{item.title}</Tag>)}
      {links.length > 3 ? <Typography.Text type="secondary">+{links.length - 3}</Typography.Text> : null}
      {!links.length ? <Typography.Text type="secondary">No items</Typography.Text> : null}
    </Flex>
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function DateCell({ value }: CustomCellRendererProps<NavigationMenu, string>) {
  return <Typography.Text>{value ? dateFormatter.format(new Date(value)) : ""}</Typography.Text>;
}

function DeleteCell({ data, context }: CustomCellRendererProps<NavigationMenu>) {
  if (!data) return null;
  return (
    <Button
      type="text"
      danger
      icon={<DeleteOutlined />}
      aria-label={`Delete ${data.title}`}
      onClick={(event) => {
        event.stopPropagation();
        context.deleteMenu(data);
      }}
    />
  );
}

function matchesDateRange(value: string, filterValue: unknown) {
  if (!Array.isArray(filterValue) || filterValue.length < 2) return true;
  const current = new Date(value).getTime();
  const from = new Date(String(filterValue[0])).getTime();
  const to = new Date(String(filterValue[1])).getTime();
  return current >= from && current <= to;
}

export default function WebsiteNavigationPage() {
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<NavigationMenu>>(null);
  const menus = useNavigationStore((state) => state.menus);
  const createMenu = useNavigationStore((state) => state.createMenu);
  const deleteMenu = useNavigationStore((state) => state.deleteMenu);
  const { push: openMenuModal } = useNavigationMenuModal();
  const { modal, message } = App.useApp();
  const pageConfig = usePageConfig<
    NavigationMenu,
    NavigationWhereInput,
    NavigationOrderField
  >({
    gridRef,
    storageKey: "navigation-grid-state",
    filterSchema: navigationFilterSchema,
    sortFieldMapping: navigationSortFieldMapping,
    defaultSort: [{ colId: "updatedAt", sort: "desc" }],
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50],
    buildSearchCondition: buildNavigationSearchCondition,
  });

  const filteredMenus = useMemo(() => {
    const search = pageConfig.searchValue.trim().toLowerCase();
    const filtered = menus.filter((menu) => {
      if (search && !`${menu.title} ${menu.slug}`.toLowerCase().includes(search)) return false;
      return pageConfig.filters.every((filter) => {
        if (filter.schemaKey === "title") {
          return menu.title.toLowerCase().includes(String(filter.value).toLowerCase());
        }
        if (filter.schemaKey === "status") {
          const values = Array.isArray(filter.value) ? filter.value : [filter.value];
          return values.includes(menu.status);
        }
        if (filter.schemaKey === "createdAt") return matchesDateRange(menu.createdAt, filter.value);
        if (filter.schemaKey === "updatedAt") return matchesDateRange(menu.updatedAt, filter.value);
        return true;
      });
    });
    const sort = pageConfig.sortModel[0];
    if (!sort) return filtered;
    return [...filtered].sort((left, right) => {
      const field = sort.colId as keyof NavigationMenu;
      const result = String(left[field] ?? "").localeCompare(String(right[field] ?? ""));
      return sort.sort === "asc" ? result : -result;
    });
  }, [menus, pageConfig.filters, pageConfig.searchValue, pageConfig.sortModel]);

  const start = pageConfig.currentPage * pageConfig.pageSize;
  const pageMenus = filteredMenus.slice(start, start + pageConfig.pageSize);

  const handleCreate = useCallback(() => {
    const created = createMenu();
    openMenuModal({ entityId: created.id });
  }, [createMenu, openMenuModal]);

  const handleDelete = useCallback(
    (menu: NavigationMenu) => {
      modal.confirm({
        title: "Delete menu?",
        content: `The menu “${menu.title}” will be permanently deleted.`,
        okText: "Delete",
        okButtonProps: { danger: true },
        onOk: () => {
          deleteMenu(menu.id);
          message.success("Menu deleted");
        },
      });
    },
    [deleteMenu, message, modal],
  );

  const columnDefs = useMemo<ColDef<NavigationMenu>[]>(
    () => [
      { headerName: "Title", field: "title", cellRenderer: TitleCell, minWidth: 280, flex: 1 },
      { headerName: "Status", field: "status", cellRenderer: StatusCell, width: 130 },
      { headerName: "Links", colId: "links", cellRenderer: LinksCell, minWidth: 280, flex: 1, sortable: false },
      { headerName: "Created", field: "createdAt", cellRenderer: DateCell, minWidth: 145 },
      { headerName: "Updated", field: "updatedAt", cellRenderer: DateCell, minWidth: 145 },
      { headerName: "", colId: "actions", cellRenderer: DeleteCell, width: 64, sortable: false, resizable: false, pinned: "right" },
    ],
    [],
  );
  const defaultColDef = useMemo<ColDef<NavigationMenu>>(
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
      name="website-navigation"
      title="Navigation"
      count={filteredMenus.length}
      actions={<Button icon={<PlusOutlined />} onClick={handleCreate}>Create</Button>}
    >
      <DataLayout.Toolbar
        left={<FilterWidget {...pageConfig.filterWidgetProps} searchPlaceholder="Search menus..." />}
      />
      <div style={{ height: "100%", paddingBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ flex: 1 }} data-testid="navigation-table">
          <AgGridReact<NavigationMenu>
            ref={gridRef}
            theme={agGridTheme}
            rowData={pageMenus}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={({ data }) => data.id}
            rowHeight={52}
            rowStyle={{ cursor: "pointer" }}
            onRowClicked={({ data }) => data && openMenuModal({ entityId: data.id })}
            context={{ deleteMenu: handleDelete }}
            suppressCellFocus
            suppressMovableColumns
            onSortChanged={pageConfig.onSortChanged}
            initialState={pageConfig.gridStateProps.initialState}
            onStateUpdated={pageConfig.gridStateProps.onStateUpdated}
          />
        </div>
        <CursorPagination
          name="navigation"
          total={filteredMenus.length}
          rangeStart={pageConfig.getRangeStart(pageMenus.length)}
          rangeEnd={Math.min(pageConfig.getRangeEnd(pageMenus.length), filteredMenus.length)}
          pageSize={pageConfig.pageSize}
          pageSizeOptions={pageConfig.pageSizeOptions}
          hasNext={start + pageConfig.pageSize < filteredMenus.length}
          hasPrev={pageConfig.currentPage > 0}
          onNext={() => pageConfig.goToNextPage(String(start + pageConfig.pageSize))}
          onPrev={() => pageConfig.goToPrevPage(String(Math.max(0, start - pageConfig.pageSize)))}
          onPageSizeChange={pageConfig.setPageSize}
        />
      </div>
    </DataLayout>
  );
}
