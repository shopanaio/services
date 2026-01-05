"use client";

import { useMemo, useCallback, useState } from "react";
import { Typography, Image, Select, Flex } from "antd";
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

export interface IShippingVariantRow extends IVariantRowBase {
  imageUrl: string | null;
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
}

export interface IShippingVariant {
  id: string;
  title: string;
  imageUrl?: string | null;
  weight?: number | null;
  weightUnit?: string;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit?: string;
  options?: IVariantOption[];
}

export interface IShippingVariantsTableProps {
  variants: IShippingVariant[];
  onChange?: (variants: IShippingVariantRow[]) => void;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  cell: {
    display: "flex",
    alignItems: "center",
    height: "100%",
  },
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
  unitSelect: {
    width: 70,
    fontSize: 11,
  },
  dimensionCell: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
}));

// ============================================================================
// Cell Renderers
// ============================================================================

const ImageCellRenderer = (
  props: CustomCellRendererProps<IShippingVariantRow>
) => {
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

// ============================================================================
// Component
// ============================================================================

export const ShippingVariantsTable = ({
  variants,
  onChange,
}: IShippingVariantsTableProps) => {
  // Extract option groups
  const optionGroups = useMemo<IOptionGroup[]>(
    () => extractOptionGroups(variants),
    [variants]
  );

  // Transform to row data
  const initialRowData = useMemo<IShippingVariantRow[]>(
    () =>
      variantsToRowData(variants, (v) => ({
        imageUrl: v.imageUrl ?? null,
        weight: v.weight ?? null,
        weightUnit: v.weightUnit ?? "G",
        length: v.length ?? null,
        width: v.width ?? null,
        height: v.height ?? null,
        dimensionUnit: v.dimensionUnit ?? "CM",
      })),
    [variants]
  );

  const [rowData, setRowData] = useState<IShippingVariantRow[]>(initialRowData);

  // Define shipping columns
  const shippingColumns = useMemo<ColDef<IShippingVariantRow>[]>(
    () => [
      {
        headerName: "Image",
        field: "imageUrl",
        width: 70,
        cellRenderer: ImageCellRenderer,
        sortable: false,
        resizable: false,
      },
      {
        headerName: "Weight",
        field: "weight",
        flex: 0.8,
        minWidth: 100,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          precision: 2,
        },
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
        cellEditorParams: {
          min: 0,
          precision: 2,
        },
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          return String(params.value);
        },
      },
      {
        headerName: "Width",
        field: "width",
        flex: 0.7,
        minWidth: 90,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          precision: 2,
        },
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          return String(params.value);
        },
      },
      {
        headerName: "Height",
        field: "height",
        flex: 0.7,
        minWidth: 90,
        editable: true,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          precision: 2,
        },
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return "—";
          const unit = params.data?.dimensionUnit || "CM";
          const unitLabel = dimensionUnitOptions[unit as keyof typeof dimensionUnitOptions]?.label || unit;
          return `${params.value} ${unitLabel}`;
        },
      },
    ],
    []
  );

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<IShippingVariantRow>) => {
      setRowData((prev) => {
        const updated = prev.map((row) => {
          if (row.id !== event.data?.id) return row;
          return { ...row, ...event.data };
        });
        onChange?.(updated);
        return updated;
      });
    },
    [onChange]
  );

  return (
    <VariantsTable<IShippingVariantRow>
      rowData={rowData}
      optionGroups={optionGroups}
      additionalColumns={shippingColumns}
      onCellValueChanged={handleCellValueChanged}
      pinnedTitle={false}
    />
  );
};

// ============================================================================
// Export row data getter for save functionality
// ============================================================================

export function getShippingDataForSave(rows: IShippingVariantRow[]) {
  return rows.map((row) => ({
    id: row.id,
    weight: row.weight,
    weightUnit: row.weightUnit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimensionUnit,
  }));
}
