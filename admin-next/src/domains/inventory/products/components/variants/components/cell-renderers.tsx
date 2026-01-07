import React from "react";
import { createStyles } from "antd-style";
import { Tag, Image } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import { SelectableCell } from "@/shared/components/ag-grid-cell-selection";
import type { IVariantEditorRow, StockStatus } from "../config";
import { useVariantsEditorStore } from "../hooks";
import type { IFieldEdit } from "@/shared/components/editor-grid";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  titleCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: "100%",
    width: "100%",
  },
  imageCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  variantImage: {
    width: 40,
    height: 40,
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
  titleText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cellContent: {
    textAlign: "right",
    width: "100%",
  },
  editedValue: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    width: "100%",
  },
  originalValue: {
    color: token.colorTextSecondary,
    textDecoration: "line-through",
  },
  arrow: {
    color: token.colorTextSecondary,
    fontSize: 12,
  },
  newValue: {
    fontWeight: 600,
  },
  statusTag: {
    margin: 0,
  },
  inStock: {
    color: token.colorSuccess,
    backgroundColor: token.colorSuccessBg,
    borderColor: token.colorSuccessBorder,
  },
  lowStock: {
    color: token.colorWarning,
    backgroundColor: token.colorWarningBg,
    borderColor: token.colorWarningBorder,
  },
  outOfStock: {
    color: token.colorError,
    backgroundColor: token.colorErrorBg,
    borderColor: token.colorErrorBorder,
  },
  optionValue: {
    color: token.colorTextSecondary,
  },
}));

// ============================================================================
// Formatters
// ============================================================================

export function formatPrice(value: number | null): string {
  if (value === null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ============================================================================
// Image Cell
// ============================================================================

export const ImageCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
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
// Title Cell
// ============================================================================

export const TitleCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data } = props;

  if (!data) return null;

  return (
    <div className={styles.titleCell}>
      <span className={styles.titleText}>{data.title}</span>
    </div>
  );
};

// ============================================================================
// Stock Status Badge
// ============================================================================

export const StockStatusRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { styles, cx } = useStyles();
  const { data } = props;

  if (!data) return null;

  const statusConfig: Record<
    StockStatus,
    { label: string; className: string }
  > = {
    in_stock: { label: "In Stock", className: styles.inStock },
    low_stock: { label: "Low Stock", className: styles.lowStock },
    out_of_stock: { label: "Out of Stock", className: styles.outOfStock },
  };

  const config = statusConfig[data.stockStatus];

  return (
    <Tag className={cx(styles.statusTag, config.className)} bordered={false}>
      {config.label}
    </Tag>
  );
};

// ============================================================================
// Text Cell
// ============================================================================

export const TextCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field;

  return (
    <SelectableCell rowId={data.id} field={field}>
      <span>{value ?? ""}</span>
    </SelectableCell>
  );
};

// ============================================================================
// Price Cell
// ============================================================================

export const PriceCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field;

  return (
    <SelectableCell rowId={data.id} field={field}>
      <div className={styles.cellContent}>
        {formatPrice(value as number | null)}
      </div>
    </SelectableCell>
  );
};

// ============================================================================
// Number Cell (with edit diff)
// ============================================================================

export const NumberCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data, colDef, value } = props;
  const getFieldEdit = useVariantsEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field;
  const edit = getFieldEdit(data.id, field) as
    | IFieldEdit<number | null>
    | undefined;

  const content = edit ? (
    <div className={styles.editedValue}>
      <span className={styles.originalValue}>{edit.originalValue ?? ""}</span>
      <span className={styles.arrow}>→</span>
      <span className={styles.newValue}>{edit.currentValue ?? ""}</span>
    </div>
  ) : (
    <div className={styles.cellContent}>{value ?? ""}</div>
  );

  return (
    <SelectableCell rowId={data.id} field={field}>
      {content}
    </SelectableCell>
  );
};

// ============================================================================
// Option Cell (read-only, displays option value)
// ============================================================================

export const OptionCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow> & { optionName: string }
> = (props) => {
  const { styles } = useStyles();
  const { data, optionName } = props;

  if (!data) return null;

  const option = data.options.find((o) => o.name === optionName);
  const value = option?.value ?? "";

  return <span className={styles.optionValue}>{value}</span>;
};
