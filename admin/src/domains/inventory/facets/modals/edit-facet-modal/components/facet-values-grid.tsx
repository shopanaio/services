"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  GetRowIdParams,
  ICellRendererParams,
  RowDragEndEvent,
  RowSelectionOptions,
  SelectionChangedEvent,
  SortChangedEvent,
} from "ag-grid-community";
import { Button, Dropdown, Flex, Input, Select, Space, Tooltip, Typography } from "antd";
import { createStyles } from "antd-style";
import { SearchOutlined } from "@ant-design/icons";
import { LuEllipsis, LuGripVertical } from "react-icons/lu";
import { FacetValueKind } from "@/graphql/types";
import { useAgGridTheme } from "@/hooks";
import type { FacetValueEditorRow } from "../types";

interface FacetValuesGridProps {
  values: FacetValueEditorRow[];
  onReorder: (values: FacetValueEditorRow[]) => void;
  onSelectionChange?: (values: FacetValueEditorRow[]) => void;
  onAddToGroup: (values: FacetValueEditorRow[]) => void;
  onEditGroup: (value: FacetValueEditorRow) => void;
  onUngroup: (values: FacetValueEditorRow[]) => void;
  onDelete: (values: FacetValueEditorRow[]) => void;
}

const useStyles = createStyles(({ token }) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  bulkPanel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 12px",
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorFillAlter,
  },
  grid: {
    height: 360,
    minHeight: 360,
  },
  dragCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    color: token.colorTextTertiary,
  },
  groupedValues: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
}));

function canMergeSelection(rows: FacetValueEditorRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.kind === FacetValueKind.Source);
}

function canUngroupSelection(rows: FacetValueEditorRow[]): boolean {
  return rows.some(
    (row) =>
      (row.kind === FacetValueKind.Display && row.sourceValues.length > 0) ||
      (row.kind === FacetValueKind.Source && Boolean(row.parent?.id)),
  );
}

function groupedLabel(row: FacetValueEditorRow): string {
  return row.sourceValues.map((value) => value.label || value.handle).join(", ");
}

function valueTestId(handle: string): string {
  return handle.replaceAll(" ", "-");
}

export function FacetValuesGrid({
  values,
  onReorder,
  onSelectionChange,
  onAddToGroup,
  onEditGroup,
  onUngroup,
  onDelete,
}: FacetValuesGridProps) {
  const { styles } = useStyles();
  const agGridTheme = useAgGridTheme();
  const gridRef = useRef<AgGridReact<FacetValueEditorRow>>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"manual" | "labelAsc" | "labelDesc">("manual");
  const [selectedRows, setSelectedRows] = useState<FacetValueEditorRow[]>([]);

  const filteredValues = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = query
      ? values.filter((value) => {
          const grouped = groupedLabel(value).toLowerCase();
          return (
            value.label.toLowerCase().includes(query) ||
            value.handle.toLowerCase().includes(query) ||
            grouped.includes(query)
          );
        })
      : values;

    if (sortMode === "labelAsc") {
      return [...rows].sort((a, b) => a.label.localeCompare(b.label));
    }
    if (sortMode === "labelDesc") {
      return [...rows].sort((a, b) => b.label.localeCompare(a.label));
    }
    return [...rows].sort((a, b) => a.sortIndex - b.sortIndex);
  }, [search, sortMode, values]);

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: true,
      enableSelectionWithoutKeys: true,
    }),
    [],
  );

  const clearSelection = useCallback(() => {
    gridRef.current?.api.deselectAll();
    setSelectedRows([]);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  useEffect(() => {
    const selectedIds = new Set(selectedRows.map((row) => row.id));
    const nextSelectedRows = values.filter((row) => selectedIds.has(row.id));

    if (nextSelectedRows.length !== selectedRows.length) {
      setSelectedRows(nextSelectedRows);
      onSelectionChange?.(nextSelectedRows);
    }
  }, [onSelectionChange, selectedRows, values]);

  const columnDefs = useMemo<ColDef<FacetValueEditorRow>[]>(
    () => [
      {
        colId: "drag",
        headerName: "Drag",
        width: 72,
        rowDrag: () => sortMode === "manual",
        sortable: false,
        cellRenderer: () => (
          <div className={styles.dragCell}>
            <LuGripVertical />
          </div>
        ),
      },
      {
        field: "label",
        headerName: "Value",
        flex: 1,
        minWidth: 180,
        sort: sortMode === "labelAsc" ? "asc" : sortMode === "labelDesc" ? "desc" : null,
        cellRenderer: ({ data }: ICellRendererParams<FacetValueEditorRow>) =>
          data ? (
            <span data-testid={`facet-values-row-${valueTestId(data.handle)}`}>
              {data.label}
            </span>
          ) : null,
      },
      {
        colId: "groupedValues",
        headerName: "Grouped values",
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        cellRenderer: ({ data }: ICellRendererParams<FacetValueEditorRow>) => {
          if (!data) return null;
          const label = groupedLabel(data);
          return label ? (
            <Tooltip title={label}>
              <span
                className={styles.groupedValues}
                data-testid={`facet-values-grouped-cell-${valueTestId(data.handle)}`}
              >
                {label}
              </span>
            </Tooltip>
          ) : (
            <Typography.Text
              type="secondary"
              data-testid={`facet-values-grouped-cell-${valueTestId(data.handle)}`}
            >
              -
            </Typography.Text>
          );
        },
      },
      {
        colId: "actions",
        width: 64,
        sortable: false,
        cellRenderer: ({ data }: ICellRendererParams<FacetValueEditorRow>) => {
          if (!data) return null;
          const isDisplay = data.kind === FacetValueKind.Display;
          return (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  ...(isDisplay
                    ? [
                        {
                          key: "edit",
                          label: (
                            <span
                              data-testid={`facet-values-action-edit-${valueTestId(data.handle)}`}
                            >
                              Edit
                            </span>
                          ),
                          onClick: () => onEditGroup(data),
                        },
                        {
                          key: "ungroup",
                          label: (
                            <span
                              data-testid={`facet-values-action-ungroup-${valueTestId(data.handle)}`}
                            >
                              Ungroup
                            </span>
                          ),
                          disabled: data.sourceValues.length === 0,
                          onClick: () => onUngroup([data]),
                        },
                      ]
                    : []),
                  {
                    key: "delete",
                    label: (
                      <span
                        data-testid={`facet-values-action-delete-${valueTestId(data.handle)}`}
                      >
                        Delete
                      </span>
                    ),
                    danger: true,
                    onClick: () => onDelete([data]),
                  },
                ],
              }}
            >
              <Button
                type="text"
                icon={<LuEllipsis />}
                aria-label={`Actions for ${data.label}`}
                data-testid={`facet-values-row-actions-${valueTestId(data.handle)}`}
              />
            </Dropdown>
          );
        },
      },
    ],
    [onDelete, onEditGroup, onUngroup, sortMode, styles.dragCell, styles.groupedValues],
  );

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<FacetValueEditorRow>) => {
      const rows = event.api.getSelectedRows();
      setSelectedRows(rows);
      onSelectionChange?.(rows);
    },
    [onSelectionChange],
  );

  const handleSortChanged = useCallback(
    (event: SortChangedEvent<FacetValueEditorRow>) => {
      const labelColumn = event.api
        .getColumnState()
        .find((column) => column.colId === "label");
      if (labelColumn?.sort === "asc") setSortMode("labelAsc");
      if (labelColumn?.sort === "desc") setSortMode("labelDesc");
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: RowDragEndEvent<FacetValueEditorRow>) => {
      if (sortMode !== "manual") return;
      const nextVisibleRows: FacetValueEditorRow[] = [];
      event.api.forEachNodeAfterFilterAndSort((node) => {
        if (node.data) nextVisibleRows.push(node.data);
      });
      const visibleIds = new Set(nextVisibleRows.map((row) => row.id));
      const hiddenRows = values.filter((row) => !visibleIds.has(row.id));
      onReorder(
        [...nextVisibleRows, ...hiddenRows].map((row, sortIndex) => ({
          ...row,
          sortIndex,
        })),
      );
    },
    [onReorder, sortMode, values],
  );

  const addToGroupEnabled = canMergeSelection(selectedRows);
  const ungroupEnabled = canUngroupSelection(selectedRows);

  return (
    <div className={styles.root}>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search filter values"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        data-testid="facet-values-search-input"
      />

      {selectedRows.length >= 2 ? (
        <div className={styles.bulkPanel} data-testid="facet-values-bulk-panel">
          <Typography.Text strong data-testid="facet-values-selection-count">
            {selectedRows.length} selected
          </Typography.Text>
          <Flex gap={8} wrap="wrap" justify="end">
            <Tooltip
              title={
                addToGroupEnabled
                  ? undefined
                  : "Only source values can be added to a group."
              }
            >
              <Button
                disabled={!addToGroupEnabled}
                onClick={() => onAddToGroup(selectedRows)}
                data-testid="facet-values-add-to-group-button"
              >
                Add to group
              </Button>
            </Tooltip>
            <Button
              disabled={!ungroupEnabled}
              onClick={() => onUngroup(selectedRows)}
              data-testid="facet-values-bulk-ungroup-button"
            >
              Ungroup
            </Button>
            <Button
              danger
              onClick={() => onDelete(selectedRows)}
              data-testid="facet-values-bulk-delete-button"
            >
              Delete
            </Button>
            <Button
              type="text"
              onClick={clearSelection}
              data-testid="facet-values-clear-selection-button"
            >
              Clear
            </Button>
          </Flex>
        </div>
      ) : null}

      <div className={styles.toolbar}>
        <Typography.Text type="secondary">Sort:</Typography.Text>
        <Select
          size="small"
          value={sortMode}
          style={{ width: 132 }}
          options={[
            { label: "Manually", value: "manual" },
            { label: "Label A-Z", value: "labelAsc" },
            { label: "Label Z-A", value: "labelDesc" },
          ]}
          onChange={(value) => setSortMode(value)}
        />
        <Button size="small" disabled={sortMode !== "manual"}>
          Reorder for me
        </Button>
      </div>

      <div className={styles.grid} data-testid="facet-values-grid">
        <AgGridReact<FacetValueEditorRow>
          ref={gridRef}
          theme={agGridTheme}
          rowData={filteredValues}
          columnDefs={columnDefs}
          getRowId={(params: GetRowIdParams<FacetValueEditorRow>) => params.data.id}
          rowHeight={44}
          headerHeight={38}
          rowDragManaged
          suppressMoveWhenRowDragging={sortMode !== "manual"}
          rowSelection={rowSelection}
          selectionColumnDef={{
            cellStyle: { display: "flex", alignItems: "center" },
          }}
          suppressCellFocus
          suppressMovableColumns
          animateRows
          noRowsOverlayComponent={() => (
            <Space direction="vertical" align="center">
              <Typography.Text type="secondary">No values found</Typography.Text>
            </Space>
          )}
          defaultColDef={{
            sortable: true,
            resizable: false,
            comparator: () => 0,
            cellStyle: { display: "flex", alignItems: "center" },
          }}
          onSelectionChanged={handleSelectionChanged}
          onSortChanged={handleSortChanged}
          onRowDragEnd={handleDragEnd}
        />
      </div>
    </div>
  );
}
