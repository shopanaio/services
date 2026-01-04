"use client";

import { useMemo, useCallback, useState } from "react";
import { Typography, Tag, Flex, Button, Dropdown } from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { ColDef, CellValueChangedEvent } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  VariantsTable,
  IVariantRowBase,
  IOptionGroup,
  IVariantOption,
  extractOptionGroups,
  variantsToRowData,
} from "./VariantsTable";

// ============================================================================
// Types
// ============================================================================

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface IInventoryVariantRow extends IVariantRowBase {
  sku: string | null;
  stock: number;
  stockStatus: StockStatus;
  weight: number | null;
  weightUnit: string;
  barcode: string | null;
}

export interface IInventoryVariant {
  id: string;
  title: string;
  sku?: string | null;
  stock?: number;
  stockStatus?: StockStatus;
  weight?: number | null;
  weightUnit?: string;
  barcode?: string | null;
  options?: IVariantOption[];
}

export interface IInventoryVariantsTableProps {
  variants: IInventoryVariant[];
  onChange?: (variants: IInventoryVariantRow[]) => void;
  lowStockThreshold?: number;
  onEdit?: () => void;
  onMoreAction?: (action: string) => void;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
  },
  cell: {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
  stockTag: {
    margin: 0,
  },
  summaryRow: {
    marginTop: 16,
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 600,
  },
  dangerValue: {
    fontSize: 14,
    fontWeight: 600,
    color: token.colorError,
  },
  warningValue: {
    fontSize: 14,
    fontWeight: 600,
    color: token.colorWarning,
  },
  successValue: {
    fontSize: 14,
    fontWeight: 600,
    color: token.colorSuccess,
  },
}));

// ============================================================================
// Cell Renderers
// ============================================================================

const StockStatusCellRenderer = (
  props: CustomCellRendererProps<IInventoryVariantRow>
) => {
  const { styles } = useStyles();
  const { data } = props;

  if (!data) return null;

  const statusConfig: Record<
    StockStatus,
    { color: string; label: string }
  > = {
    in_stock: { color: "success", label: "In Stock" },
    low_stock: { color: "warning", label: "Low Stock" },
    out_of_stock: { color: "error", label: "Out of Stock" },
  };

  const config = statusConfig[data.stockStatus];

  return (
    <Tag color={config.color} className={styles.stockTag}>
      {config.label}
    </Tag>
  );
};

// ============================================================================
// Helpers
// ============================================================================

const getStockStatus = (stock: number, threshold: number): StockStatus => {
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
};

// ============================================================================
// Component
// ============================================================================

export const InventoryVariantsTable = ({
  variants,
  onChange,
  lowStockThreshold = 10,
  onEdit,
  onMoreAction,
}: IInventoryVariantsTableProps) => {
  const { styles } = useStyles();

  const menuItems = [
    { key: "edit", label: "Edit" },
    { key: "adjust", label: "Adjust stock" },
    { key: "transfer", label: "Transfer stock" },
    { type: "divider" as const },
    { key: "export", label: "Export data" },
  ];

  const handleMenuClick = useCallback(
    (key: string) => {
      if (key === "edit" && onEdit) {
        onEdit();
      } else {
        onMoreAction?.(key);
      }
    },
    [onEdit, onMoreAction]
  );

  // Extract option groups
  const optionGroups = useMemo<IOptionGroup[]>(
    () => extractOptionGroups(variants),
    [variants]
  );

  // Transform to row data
  const initialRowData = useMemo<IInventoryVariantRow[]>(
    () =>
      variantsToRowData(variants, (v) => ({
        sku: v.sku ?? null,
        stock: v.stock ?? 0,
        stockStatus:
          v.stockStatus ?? getStockStatus(v.stock ?? 0, lowStockThreshold),
        weight: v.weight ?? null,
        weightUnit: v.weightUnit ?? "g",
        barcode: v.barcode ?? null,
      })),
    [variants, lowStockThreshold]
  );

  const [rowData, setRowData] = useState<IInventoryVariantRow[]>(initialRowData);

  // Define inventory columns
  const inventoryColumns = useMemo<ColDef<IInventoryVariantRow>[]>(
    () => [
      {
        headerName: "SKU",
        field: "sku",
        flex: 1,
        minWidth: 120,
        editable: true,
        cellEditor: "agTextCellEditor",
        valueFormatter: (params) => params.value ?? "—",
      },
      {
        headerName: "Stock",
        field: "stock",
        flex: 0.8,
        minWidth: 100,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          precision: 0,
        },
      },
      {
        headerName: "Status",
        field: "stockStatus",
        flex: 1,
        minWidth: 120,
        cellRenderer: StockStatusCellRenderer,
      },
    ],
    []
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IInventoryVariantRow>) => {
      setRowData((prev) => {
        const updated = prev.map((row) => {
          if (row.id !== event.data?.id) return row;

          const updatedRow = { ...row, ...event.data };

          // Recalculate stock status when stock changes
          if (event.colDef?.field === "stock") {
            updatedRow.stockStatus = getStockStatus(
              updatedRow.stock,
              lowStockThreshold
            );
          }

          return updatedRow;
        });
        onChange?.(updated);
        return updated;
      });
    },
    [onChange, lowStockThreshold]
  );

  return (
    <>
      {(onEdit || onMoreAction) && (
        <div className={styles.header}>
          <Typography.Text className={styles.title}>Inventory</Typography.Text>
          <Dropdown
            menu={{
              items: menuItems,
              onClick: ({ key }) => handleMenuClick(key),
            }}
            trigger={["click"]}
          >
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      )}
      <VariantsTable<IInventoryVariantRow>
        rowData={rowData}
        optionGroups={optionGroups}
        additionalColumns={inventoryColumns}
        onCellValueChanged={handleCellValueChanged}
      />
    </>
  );
};

// ============================================================================
// Export row data getter for save functionality
// ============================================================================

export function getInventoryDataForSave(rows: IInventoryVariantRow[]) {
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    stock: row.stock,
    weight: row.weight,
    weightUnit: row.weightUnit,
    barcode: row.barcode,
  }));
}
