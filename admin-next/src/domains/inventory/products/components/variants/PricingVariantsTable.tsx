"use client";

import { useMemo, useCallback, useState } from "react";
import { Typography, Flex, Button, Dropdown } from "antd";
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
// Constants
// ============================================================================

const NBSP = "\u00A0";

// ============================================================================
// Types
// ============================================================================

export interface IPricingVariantRow extends IVariantRowBase {
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
}

export interface IPricingVariant {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  options?: IVariantOption[];
}

export interface IPricingVariantsTableProps {
  variants: IPricingVariant[];
  formatPrice?: (amount: number) => string;
  onChange?: (variants: IPricingVariantRow[]) => void;
  onEdit?: () => void;
  onMoreAction?: (action: string) => void;
  onSave?: (
    variants: Array<{
      id: string;
      price: number;
      compareAtPrice: number | null;
      costPrice: number | null;
    }>
  ) => void;
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
  priceCell: {
    display: "flex",
    alignItems: "center",
    height: "100%",
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
}));

// ============================================================================
// Cell Renderer
// ============================================================================

interface IPriceCellRendererProps
  extends CustomCellRendererProps<IPricingVariantRow> {
  formatPrice: (amount: number) => string;
}

const PriceCellRenderer = (props: IPriceCellRendererProps) => {
  const { styles } = useStyles();
  const { value, formatPrice } = props;

  if (value === null || value === undefined) {
    return (
      <Typography.Text type="secondary" className={styles.priceCell}>
        —
      </Typography.Text>
    );
  }

  return (
    <Typography.Text className={styles.priceCell}>
      {formatPrice(value)}
    </Typography.Text>
  );
};

// ============================================================================
// Default Format Price
// ============================================================================

const defaultFormatPrice = (amount: number): string => {
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
  return formatted.replace(/\s+/g, NBSP);
};

// ============================================================================
// Component
// ============================================================================

export const PricingVariantsTable = ({
  variants,
  formatPrice: formatPriceProp,
  onChange,
}: IPricingVariantsTableProps) => {
  const { styles } = useStyles();
  const formatPrice = formatPriceProp || defaultFormatPrice;

  // Extract option groups
  const optionGroups = useMemo<IOptionGroup[]>(
    () => extractOptionGroups(variants),
    [variants]
  );

  // Transform to row data
  const initialRowData = useMemo<IPricingVariantRow[]>(
    () =>
      variantsToRowData(variants, (v) => ({
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? null,
        costPrice: v.costPrice ?? null,
      })),
    [variants]
  );

  const [rowData, setRowData] = useState<IPricingVariantRow[]>(initialRowData);

  // Define pricing columns
  const pricingColumns = useMemo<ColDef<IPricingVariantRow>[]>(
    () => [
      {
        headerName: "Price",
        field: "price",
        flex: 1,
        minWidth: 140,
        editable: true,
        cellRenderer: (params: CustomCellRendererProps<IPricingVariantRow>) => (
          <PriceCellRenderer {...params} formatPrice={formatPrice} />
        ),
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          precision: 0,
        },
        valueFormatter: (params) =>
          params.value != null ? formatPrice(params.value) : "—",
      },
      {
        headerName: "Compare at Price",
        field: "compareAtPrice",
        flex: 1,
        minWidth: 160,
        editable: true,
        cellRenderer: (params: CustomCellRendererProps<IPricingVariantRow>) => (
          <PriceCellRenderer {...params} formatPrice={formatPrice} />
        ),
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          precision: 0,
        },
        valueFormatter: (params) =>
          params.value != null ? formatPrice(params.value) : "—",
      },
      {
        headerName: "Cost Price",
        field: "costPrice",
        flex: 1,
        minWidth: 140,
        editable: true,
        cellRenderer: (params: CustomCellRendererProps<IPricingVariantRow>) => (
          <PriceCellRenderer {...params} formatPrice={formatPrice} />
        ),
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          precision: 0,
        },
        valueFormatter: (params) =>
          params.value != null ? formatPrice(params.value) : "—",
      },
    ],
    [formatPrice]
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IPricingVariantRow>) => {
      setRowData((prev) => {
        const updated = prev.map((row) =>
          row.id === event.data?.id ? { ...row, ...event.data } : row
        );
        onChange?.(updated);
        return updated;
      });
    },
    [onChange]
  );

  return (
    <VariantsTable<IPricingVariantRow>
      rowData={rowData}
      optionGroups={optionGroups}
      additionalColumns={pricingColumns}
      onCellValueChanged={handleCellValueChanged}
    />
  );
};

// ============================================================================
// Export row data getter for save functionality
// ============================================================================

export function getPricingDataForSave(rows: IPricingVariantRow[]) {
  return rows.map((row) => ({
    id: row.id,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    costPrice: row.costPrice,
  }));
}
