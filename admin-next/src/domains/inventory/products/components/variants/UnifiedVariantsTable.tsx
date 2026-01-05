"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { Typography, Image, Tag } from "antd";
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
import { weightUnitOptions, dimensionUnitOptions } from "../../constants";

// ============================================================================
// Types
// ============================================================================

export type VariantTabKey = "inventory" | "pricing" | "shipping" | "media" | "options";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface IUnifiedVariantRow extends IVariantRowBase {
  imageUrl: string | null;
  // Inventory
  sku: string | null;
  stock: number;
  stockStatus: StockStatus;
  barcode: string | null;
  // Pricing
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  // Shipping
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
}

export interface IUnifiedVariant {
  id: string;
  title: string;
  imageUrl?: string | null;
  // Inventory
  sku?: string | null;
  stock?: number;
  barcode?: string | null;
  // Pricing
  price?: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  // Shipping
  weight?: number | null;
  weightUnit?: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit?: string;
  // Options
  options?: IVariantOption[];
}

export interface IUnifiedVariantsTableProps {
  variants: IUnifiedVariant[];
  activeTab: VariantTabKey;
  onChange?: (variants: IUnifiedVariantRow[]) => void;
  formatPrice?: (amount: number) => string;
  lowStockThreshold?: number;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  imageCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  variantImage: {
    borderRadius: 4,
    objectFit: "cover" as const,
  },
  imagePlaceholder: {
    width: 40,
    height: 40,
    background: token.colorBgContainerDisabled,
    borderRadius: 4,
    flexShrink: 0,
  },
  priceCell: {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
  stockTag: {
    margin: 0,
  },
}));

// ============================================================================
// Constants
// ============================================================================

const NBSP = "\u00A0";

const defaultFormatPrice = (amount: number): string => {
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
  return formatted.replace(/\s+/g, NBSP);
};

const getStockStatus = (stock: number, threshold: number): StockStatus => {
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
};

// ============================================================================
// Cell Renderers
// ============================================================================

const ImageCellRenderer = (props: CustomCellRendererProps<IUnifiedVariantRow>) => {
  const { styles } = useStyles();
  const { data } = props;

  if (!data) return null;

  return (
    <div className={styles.imageCell}>
      {data.imageUrl ? (
        <Image
          src={data.imageUrl}
          alt={data.title}
          width={40}
          height={40}
          className={styles.variantImage}
          preview={false}
        />
      ) : (
        <div className={styles.imagePlaceholder} />
      )}
    </div>
  );
};

const StockStatusCellRenderer = (props: CustomCellRendererProps<IUnifiedVariantRow>) => {
  const { styles } = useStyles();
  const { data } = props;

  if (!data) return null;

  const statusConfig: Record<StockStatus, { color: string; label: string }> = {
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

interface IPriceCellRendererProps extends CustomCellRendererProps<IUnifiedVariantRow> {
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
// Component
// ============================================================================

export const UnifiedVariantsTable = ({
  variants,
  activeTab,
  onChange,
  formatPrice: formatPriceProp,
  lowStockThreshold = 10,
}: IUnifiedVariantsTableProps) => {
  const formatPrice = formatPriceProp || defaultFormatPrice;

  // Extract option groups
  const optionGroups = useMemo<IOptionGroup[]>(
    () => extractOptionGroups(variants),
    [variants]
  );

  // Transform to row data
  const initialRowData = useMemo<IUnifiedVariantRow[]>(
    () =>
      variantsToRowData(variants, (v) => ({
        imageUrl: v.imageUrl ?? null,
        // Inventory
        sku: v.sku ?? null,
        stock: v.stock ?? 0,
        stockStatus: getStockStatus(v.stock ?? 0, lowStockThreshold),
        barcode: v.barcode ?? null,
        // Pricing
        price: v.price ?? 0,
        compareAtPrice: v.compareAtPrice ?? null,
        costPrice: v.costPrice ?? null,
        // Shipping
        weight: v.weight ?? null,
        weightUnit: v.weightUnit ?? "G",
        length: v.length ?? null,
        width: v.width ?? null,
        height: v.height ?? null,
        dimensionUnit: v.dimensionUnit ?? "CM",
      })),
    [variants, lowStockThreshold]
  );

  const [rowData, setRowData] = useState<IUnifiedVariantRow[]>(initialRowData);
  const rowDataRef = useRef(rowData);

  // Sync rowData when variants change
  useEffect(() => {
    setRowData(initialRowData);
  }, [initialRowData]);

  useEffect(() => {
    rowDataRef.current = rowData;
  }, [rowData]);

  // Common image column
  const imageColumn: ColDef<IUnifiedVariantRow> = useMemo(
    () => ({
      headerName: "Image",
      field: "imageUrl",
      width: 70,
      cellRenderer: ImageCellRenderer,
      sortable: false,
      resizable: false,
    }),
    []
  );

  // Column definitions for each tab
  const inventoryColumns = useMemo<ColDef<IUnifiedVariantRow>[]>(
    () => [
      imageColumn,
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
        cellEditorParams: { min: 0, precision: 0 },
      },
      {
        headerName: "Status",
        field: "stockStatus",
        flex: 1,
        minWidth: 120,
        cellRenderer: StockStatusCellRenderer,
      },
      {
        headerName: "Barcode",
        field: "barcode",
        flex: 1,
        minWidth: 140,
        editable: true,
        cellEditor: "agTextCellEditor",
        valueFormatter: (params) => params.value ?? "—",
      },
    ],
    [imageColumn]
  );

  const pricingColumns = useMemo<ColDef<IUnifiedVariantRow>[]>(
    () => [
      imageColumn,
      {
        headerName: "Price",
        field: "price",
        flex: 1,
        minWidth: 140,
        editable: true,
        cellRenderer: (params: CustomCellRendererProps<IUnifiedVariantRow>) => (
          <PriceCellRenderer {...params} formatPrice={formatPrice} />
        ),
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        valueFormatter: (params) => (params.value != null ? formatPrice(params.value) : "—"),
      },
      {
        headerName: "Compare at Price",
        field: "compareAtPrice",
        flex: 1,
        minWidth: 160,
        editable: true,
        cellRenderer: (params: CustomCellRendererProps<IUnifiedVariantRow>) => (
          <PriceCellRenderer {...params} formatPrice={formatPrice} />
        ),
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        valueFormatter: (params) => (params.value != null ? formatPrice(params.value) : "—"),
      },
      {
        headerName: "Cost Price",
        field: "costPrice",
        flex: 1,
        minWidth: 140,
        editable: true,
        cellRenderer: (params: CustomCellRendererProps<IUnifiedVariantRow>) => (
          <PriceCellRenderer {...params} formatPrice={formatPrice} />
        ),
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 0 },
        valueFormatter: (params) => (params.value != null ? formatPrice(params.value) : "—"),
      },
    ],
    [imageColumn, formatPrice]
  );

  const shippingColumns = useMemo<ColDef<IUnifiedVariantRow>[]>(
    () => [
      imageColumn,
      {
        headerName: "Weight",
        field: "weight",
        flex: 0.8,
        minWidth: 100,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 2 },
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          const unit = params.data?.weightUnit || "G";
          const unitLabel = weightUnitOptions[unit as keyof typeof weightUnitOptions]?.label || unit;
          return `${params.value} ${unitLabel}`;
        },
      },
      {
        headerName: "Length",
        field: "length",
        flex: 0.7,
        minWidth: 90,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 2 },
        valueFormatter: (params) => (params.value != null ? String(params.value) : "—"),
      },
      {
        headerName: "Width",
        field: "width",
        flex: 0.7,
        minWidth: 90,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 2 },
        valueFormatter: (params) => (params.value != null ? String(params.value) : "—"),
      },
      {
        headerName: "Height",
        field: "height",
        flex: 0.7,
        minWidth: 90,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: { min: 0, precision: 2 },
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          const unit = params.data?.dimensionUnit || "CM";
          const unitLabel = dimensionUnitOptions[unit as keyof typeof dimensionUnitOptions]?.label || unit;
          return `${params.value} ${unitLabel}`;
        },
      },
    ],
    [imageColumn]
  );

  const mediaColumns = useMemo<ColDef<IUnifiedVariantRow>[]>(
    () => [imageColumn],
    [imageColumn]
  );

  const optionsColumns = useMemo<ColDef<IUnifiedVariantRow>[]>(
    () => [imageColumn],
    [imageColumn]
  );

  // Get columns based on active tab
  const additionalColumns = useMemo(() => {
    switch (activeTab) {
      case "inventory":
        return inventoryColumns;
      case "pricing":
        return pricingColumns;
      case "shipping":
        return shippingColumns;
      case "media":
        return mediaColumns;
      case "options":
        return optionsColumns;
      default:
        return [];
    }
  }, [activeTab, inventoryColumns, pricingColumns, shippingColumns, mediaColumns, optionsColumns]);

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IUnifiedVariantRow>) => {
      setRowData((prev) => {
        const updated = prev.map((row) => {
          if (row.id !== event.data?.id) return row;

          const updatedRow = { ...row, ...event.data };

          // Recalculate stock status when stock changes
          if (event.colDef?.field === "stock") {
            updatedRow.stockStatus = getStockStatus(updatedRow.stock, lowStockThreshold);
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
    <VariantsTable<IUnifiedVariantRow>
      rowData={rowData}
      optionGroups={optionGroups}
      additionalColumns={additionalColumns}
      onCellValueChanged={handleCellValueChanged}
      pinnedTitle={activeTab !== "options"}
    />
  );
};

// ============================================================================
// Export data getters for save functionality
// ============================================================================

export function getUnifiedDataForSave(rows: IUnifiedVariantRow[]) {
  return rows.map((row) => ({
    id: row.id,
    // Inventory
    sku: row.sku,
    stock: row.stock,
    barcode: row.barcode,
    // Pricing
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    costPrice: row.costPrice,
    // Shipping
    weight: row.weight,
    weightUnit: row.weightUnit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimensionUnit,
  }));
}
