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
  dashLine: {
    display: "inline-block",
    width: 24,
    height: 4,
    backgroundColor: token.colorBorder,
    borderRadius: 2,
    verticalAlign: "middle",
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
    textAlign: "right",
    width: "100%",
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

// Title cell with hierarchy (no edit diff for text)
export const TitleCellRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles, cx } = useStyles();
  const { data, value } = props;

  if (!data) return null;

  const isVariant = data.rowType === "variant";

  return (
    <div className={styles.titleCell}>
      <span className={cx(styles.titleText, isVariant ? styles.variantTitle : styles.productTitle)}>
        {value || data.title}
      </span>
    </div>
  );
};

// Dash element for empty cells
export const DashLine: React.FC = () => {
  const { styles } = useStyles();
  return <span className={styles.dashLine} />;
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
    return <div className={styles.priceCell}><DashLine /></div>;
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<number | null> | undefined;

  if (edit) {
    const origPrice = formatPrice(edit.originalValue);
    const newPrice = formatPrice(edit.currentValue);
    return (
      <div className={styles.editedValue}>
        <span className={styles.originalValue}>{origPrice ?? ""}</span>
        <span className={styles.arrow}> → </span>
        <span className={styles.newValue}>{newPrice ?? ""}</span>
      </div>
    );
  }

  const formatted = formatPrice(value);
  return <div className={styles.priceCell}>{formatted ?? ""}</div>;
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
    return <div className={styles.stockCell}><DashLine /></div>;
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<number | null> | undefined;

  if (edit) {
    return (
      <div className={styles.editedValue}>
        <span className={styles.originalValue}>{edit.originalValue ?? ""}</span>
        <span className={styles.arrow}> → </span>
        <span className={styles.newValue}>{edit.currentValue ?? ""}</span>
      </div>
    );
  }

  return <div className={styles.stockCell}>{value ?? ""}</div>;
};

// Stock status badge
export const StockStatusRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { styles, cx } = useStyles();
  const { data } = props;

  if (!data) return null;

  // Check if value should be dash (product rows for multi-variant)
  if (data.rowType === "product") {
    return <DashLine />;
  }

  const status = data.stockStatus;
  if (!status) return null;

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
    return <DashLine />;
  }

  const status = data.productStatus;
  if (!status) return null;

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

// Generic text cell (no edit diff for text)
export const TextCellRenderer: React.FC<CustomCellRendererProps<IBulkEditorRow>> = (props) => {
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  // Check if value should be dash
  const isVariantColumn = ["sku", "barcode", "price", "compareAtPrice", "costPrice", "stock", "stockStatus", "weight", "weightUnit", "length", "width", "height", "dimensionUnit"].includes(field);
  const shouldShowDash =
    (data.rowType === "product" && isVariantColumn) ||
    (data.rowType === "variant" && !isVariantColumn);

  if (shouldShowDash) {
    return <DashLine />;
  }

  return <span>{value ?? ""}</span>;
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
    return <div className={styles.stockCell}><DashLine /></div>;
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<number | null> | undefined;

  if (edit) {
    return (
      <div className={styles.editedValue}>
        <span className={styles.originalValue}>{edit.originalValue ?? ""}</span>
        <span className={styles.arrow}> → </span>
        <span className={styles.newValue}>{edit.currentValue ?? ""}</span>
      </div>
    );
  }

  return <div className={styles.stockCell}>{value ?? ""}</div>;
};
