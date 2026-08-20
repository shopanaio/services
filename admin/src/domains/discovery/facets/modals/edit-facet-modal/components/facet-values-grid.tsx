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
} from "ag-grid-community";
import { Button, Dropdown, Flex, Input, Space, Tooltip, Typography } from "antd";
import { createStyles } from "antd-style";
import { LuSearch as SearchOutlined } from "react-icons/lu";
import { LuEllipsis } from "react-icons/lu";
import { FacetValueKind } from "@/graphql/types";
import { useAgGridTheme } from "@/hooks";
import { Dash } from "@/shared/components/editor-grid";
import { DEFAULT_SWATCH } from "@/domains/inventory/products/modals/edit-options-modal/edit-options-modal.constants";
import { SwatchPicker } from "@/domains/inventory/products/modals/edit-options-modal/components/swatch-picker";
import type { OptionEditorSwatch } from "@/domains/inventory/products/modals/edit-options-modal/types";
import type { FacetValueEditorRow } from "../types";

interface FacetValuesGridProps {
  values: FacetValueEditorRow[];
  swatchesEnabled: boolean;
  selectionResetKey?: number;
  onReorder: (values: FacetValueEditorRow[]) => void;
  onSwatchChange: (valueId: string, swatch: OptionEditorSwatch) => void;
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
  swatchCell: {
    display: "inline-flex",
    alignItems: "center",
  },
  valueHeader: {
    "& .ag-header-cell-label": {
      paddingLeft: 32,
    },
  },
  bulkPanel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 32,
  },
  grid: {
    height: 360,
    minHeight: 360,
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
      (row.kind === FacetValueKind.Group && row.sourceValues.length > 0) ||
      (row.kind === FacetValueKind.Source && Boolean(row.parent?.id)),
  );
}

function groupedLabel(row: FacetValueEditorRow): string {
  return row.sourceValues.map((value) => value.label || value.handle).join(", ");
}

function valueTestId(handle: string): string {
  return handle.replaceAll(" ", "-");
}

interface FacetValueSwatchCellProps {
  valueId: string;
  swatch: OptionEditorSwatch | null | undefined;
  className: string;
  testId: string;
  onCommit: (valueId: string, swatch: OptionEditorSwatch) => void;
}

function getSwatchDraft(swatch: OptionEditorSwatch | null | undefined): OptionEditorSwatch {
  return swatch ?? { ...DEFAULT_SWATCH };
}

function FacetValueSwatchCell({
  valueId,
  swatch,
  className,
  testId,
  onCommit,
}: FacetValueSwatchCellProps) {
  const [open, setOpen] = useState(false);
  const [draftSwatch, setDraftSwatch] = useState<OptionEditorSwatch>(getSwatchDraft(swatch));

  useEffect(() => {
    if (!open) {
      setDraftSwatch(getSwatchDraft(swatch));
    }
  }, [open, swatch]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setDraftSwatch(getSwatchDraft(swatch));
        setOpen(true);
        return;
      }

      onCommit(valueId, draftSwatch);
      setOpen(false);
    },
    [draftSwatch, onCommit, swatch, valueId],
  );

  return (
    <span
      className={className}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      data-testid={testId}
    >
      <SwatchPicker
        swatch={draftSwatch}
        onChange={setDraftSwatch}
        open={open}
        onOpenChange={handleOpenChange}
      />
    </span>
  );
}

export function FacetValuesGrid({
  values,
  swatchesEnabled,
  selectionResetKey,
  onReorder,
  onSwatchChange,
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

    return [...rows].sort((a, b) => a.sortIndex - b.sortIndex);
  }, [search, values]);

  const rowSelection = useMemo<RowSelectionOptions>(
    () => ({
      mode: "multiRow",
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
      enableSelectionWithoutKeys: false,
    }),
    [],
  );

  const clearSelection = useCallback(() => {
    gridRef.current?.api?.deselectAll();
    setSelectedRows([]);
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  useEffect(() => {
    clearSelection();
  }, [clearSelection, selectionResetKey]);

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
        field: "label",
        headerName: "Value",
        headerClass: styles.valueHeader,
        flex: 1,
        minWidth: 180,
        rowDrag: true,
        sortable: false,
        cellRenderer: ({ data }: ICellRendererParams<FacetValueEditorRow>) =>
          data ? (
            <Flex gap={8} align="center">
              {swatchesEnabled ? (
                <FacetValueSwatchCell
                  valueId={data.id}
                  swatch={data.swatch}
                  className={styles.swatchCell}
                  testId={`facet-values-swatch-cell-${valueTestId(data.handle)}`}
                  onCommit={onSwatchChange}
                />
              ) : null}
              <span data-testid={`facet-values-row-${valueTestId(data.handle)}`}>{data.label}</span>
            </Flex>
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
            <span data-testid={`facet-values-grouped-cell-${valueTestId(data.handle)}`}>
              <Dash />
            </span>
          );
        },
      },
      {
        colId: "actions",
        width: 64,
        sortable: false,
        cellRenderer: ({ data }: ICellRendererParams<FacetValueEditorRow>) => {
          if (!data) return null;
          const isGroup = data.kind === FacetValueKind.Group;
          return (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  ...(isGroup
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
                      <span data-testid={`facet-values-action-delete-${valueTestId(data.handle)}`}>
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
    [
      onDelete,
      onEditGroup,
      onSwatchChange,
      onUngroup,
      styles.groupedValues,
      styles.swatchCell,
      styles.valueHeader,
      swatchesEnabled,
    ],
  );

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<FacetValueEditorRow>) => {
      const rows = event.api.getSelectedRows();
      setSelectedRows(rows);
      onSelectionChange?.(rows);
    },
    [onSelectionChange],
  );

  const handleDragEnd = useCallback(
    (event: RowDragEndEvent<FacetValueEditorRow>) => {
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
    [onReorder, values],
  );

  const addToGroupEnabled = canMergeSelection(selectedRows);
  const ungroupEnabled = canUngroupSelection(selectedRows);

  return (
    <div className={styles.root}>
      {selectedRows.length > 0 ? (
        <div className={styles.bulkPanel} data-testid="facet-values-bulk-panel">
          <Typography.Text strong data-testid="facet-values-selection-count">
            {selectedRows.length} selected
          </Typography.Text>
          <Flex gap={8} wrap="wrap" justify="end">
            <Tooltip
              title={addToGroupEnabled ? undefined : "Only source values can be added to a group."}
            >
              <Button
                size="small"
                disabled={!addToGroupEnabled}
                onClick={() => onAddToGroup(selectedRows)}
                data-testid="facet-values-add-to-group-button"
              >
                Add to group
              </Button>
            </Tooltip>
            <Button
              size="small"
              disabled={!ungroupEnabled}
              onClick={() => onUngroup(selectedRows)}
              data-testid="facet-values-bulk-ungroup-button"
            >
              Ungroup
            </Button>
            <Button
              size="small"
              danger
              onClick={() => onDelete(selectedRows)}
              data-testid="facet-values-bulk-delete-button"
            >
              Delete
            </Button>
            <Button
              size="small"
              type="text"
              onClick={clearSelection}
              data-testid="facet-values-clear-selection-button"
            >
              Clear
            </Button>
          </Flex>
        </div>
      ) : (
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search filter values"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          data-testid="facet-values-search-input"
        />
      )}

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
            sortable: false,
            resizable: false,
            comparator: () => 0,
            cellStyle: { display: "flex", alignItems: "center" },
          }}
          onSelectionChanged={handleSelectionChanged}
          onRowDragEnd={handleDragEnd}
        />
      </div>
    </div>
  );
}
