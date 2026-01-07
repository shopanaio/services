import React from "react";
import { createStyles } from "antd-style";
import { Tag } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import { IBulkEditorRow, IFieldEdit } from "../../types";
import { useBulkEditorStore } from "../../hooks/useBulkEditorStore";
import { formatPrice } from "../../utils/transformers";

const useStyles = createStyles(({ token }) => ({
  titleCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: "100%",
    width: "100%",
  },
  titleText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  productTitle: {
    fontWeight: 500,
  },
  variantTitle: {
    color: token.colorTextSecondary,
    paddingLeft: 16,
  },
  dashCell: {
    color: token.colorTextQuaternary,
    textAlign: "center",
    userSelect: "none",
    width: "100%",
  },
  priceCell: {
    textAlign: "right",
    width: "100%",
  },
  stockCell: {
    textAlign: "right",
    width: "100%",
  },
  editedValue: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  originalValue: {
    textDecoration: "line-through",
    color: token.colorTextQuaternary,
    fontSize: 12,
  },
  arrow: {
    color: token.colorTextQuaternary,
    fontSize: 11,
  },
  newValue: {
    fontWeight: 500,
    color: token.colorPrimary,
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
}));

// Title cell with hierarchy and edit diff support
export const TitleCellRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles, cx } = useStyles();
  const { data } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data) return null;

  const isVariant = data.rowType === "variant";
  const edit = getFieldEdit(data.id, "title") as IFieldEdit<string> | undefined;

  if (edit) {
    return (
      <div className={cx(styles.titleCell, isVariant ? styles.variantTitle : styles.productTitle)}>
        <span className={styles.originalValue}>{edit.originalValue}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.newValue}>{edit.currentValue}</span>
      </div>
    );
  }

  return (
    <div className={styles.titleCell}>
      <span className={cx(styles.titleText, isVariant ? styles.variantTitle : styles.productTitle)}>
        {data.title}
      </span>
    </div>
  );
};

// Dash cell for non-applicable columns
export const DashCellRenderer: React.FC = () => {
  const { styles } = useStyles();
  return <div className={styles.dashCell}>—</div>;
};

// Price cell with edit diff
export const PriceCellRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles } = useStyles();
  const { data, colDef } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;
  const value = data[field] as number | null;

  // Check if value should be dash
  const category = ["sku", "barcode", "price", "compareAtPrice", "costPrice", "stock", "stockStatus", "weight", "weightUnit", "length", "width", "height", "dimensionUnit"].includes(field) ? "variant" : "product";
  const shouldShowDash =
    (data.rowType === "product" && category === "variant") ||
    (data.rowType === "variant" && category === "product");

  if (shouldShowDash) {
    return <DashCellRenderer />;
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<number | null> | undefined;

  if (edit) {
    return (
      <div className={styles.editedValue}>
        <span className={styles.originalValue}>{formatPrice(edit.originalValue)}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.newValue}>{formatPrice(edit.currentValue)}</span>
      </div>
    );
  }

  return <div className={styles.priceCell}>{formatPrice(value)}</div>;
};

// Stock cell with edit diff
export const StockCellRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles } = useStyles();
  const { data, colDef } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;
  const value = data[field] as number | null;

  // Check if value should be dash
  const shouldShowDash =
    (data.rowType === "product") ||
    (data.rowType === "variant" && !["sku", "barcode", "price", "compareAtPrice", "costPrice", "stock", "stockStatus", "weight", "weightUnit", "length", "width", "height", "dimensionUnit"].includes(field));

  if (shouldShowDash) {
    return <DashCellRenderer />;
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<number | null> | undefined;

  if (edit) {
    return (
      <div className={styles.editedValue}>
        <span className={styles.originalValue}>{edit.originalValue ?? "—"}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.newValue}>{edit.currentValue ?? "—"}</span>
      </div>
    );
  }

  return <div className={styles.stockCell}>{value ?? "—"}</div>;
};

// Stock status badge
export const StockStatusRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles, cx } = useStyles();
  const { data } = props;

  if (!data) return null;

  // Check if value should be dash (product rows for multi-variant)
  if (data.rowType === "product") {
    return <DashCellRenderer />;
  }

  const status = data.stockStatus;
  if (!status) return <DashCellRenderer />;

  const statusConfig = {
    in_stock: { label: "In Stock", className: styles.inStock },
    low_stock: { label: "Low Stock", className: styles.lowStock },
    out_of_stock: { label: "Out of Stock", className: styles.outOfStock },
  };

  const config = statusConfig[status];

  return (
    <Tag className={cx(styles.statusTag, config.className)} bordered={false}>
      {config.label}
    </Tag>
  );
};

// Product status badge
export const ProductStatusRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles, cx } = useStyles();
  const { data } = props;

  if (!data) return null;

  // Check if value should be dash (variant rows)
  if (data.rowType === "variant") {
    return <DashCellRenderer />;
  }

  const status = data.productStatus;
  if (!status) return <DashCellRenderer />;

  const statusConfig = {
    published: { label: "Published", className: styles.inStock },
    draft: { label: "Draft", className: styles.lowStock },
  };

  const config = statusConfig[status];

  return (
    <Tag className={cx(styles.statusTag, config.className)} bordered={false}>
      {config.label}
    </Tag>
  );
};

// Generic text cell with edit diff
export const TextCellRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles } = useStyles();
  const { data, colDef, value } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  // Check if value should be dash
  const isVariantColumn = ["sku", "barcode", "price", "compareAtPrice", "costPrice", "stock", "stockStatus", "weight", "weightUnit", "length", "width", "height", "dimensionUnit"].includes(field);
  const shouldShowDash =
    (data.rowType === "product" && isVariantColumn) ||
    (data.rowType === "variant" && !isVariantColumn);

  if (shouldShowDash) {
    return <DashCellRenderer />;
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<string | null> | undefined;

  if (edit) {
    return (
      <div className={styles.editedValue} style={{ justifyContent: "flex-start" }}>
        <span className={styles.originalValue}>{edit.originalValue || "—"}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.newValue}>{edit.currentValue || "—"}</span>
      </div>
    );
  }

  return <span>{value ?? "—"}</span>;
};

// Number cell with edit diff
export const NumberCellRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles } = useStyles();
  const { data, colDef, value } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  // Check if value should be dash
  const isVariantColumn = ["sku", "barcode", "price", "compareAtPrice", "costPrice", "stock", "stockStatus", "weight", "weightUnit", "length", "width", "height", "dimensionUnit"].includes(field);
  const shouldShowDash =
    (data.rowType === "product" && isVariantColumn) ||
    (data.rowType === "variant" && !isVariantColumn);

  if (shouldShowDash) {
    return <DashCellRenderer />;
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<number | null> | undefined;

  if (edit) {
    return (
      <div className={styles.editedValue}>
        <span className={styles.originalValue}>{edit.originalValue ?? "—"}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.newValue}>{edit.currentValue ?? "—"}</span>
      </div>
    );
  }

  return <div style={{ textAlign: "right", width: "100%" }}>{value ?? "—"}</div>;
};
