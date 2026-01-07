import React from "react";
import { createStyles } from "antd-style";
import { Tag } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  IBulkEditorRow,
  IFieldEdit,
  shouldShowDash,
  formatPrice,
} from "../../types";
import { useBulkEditorStore } from "../../hooks/useBulkEditorStore";
import { SelectableCell } from "@/shared/components/ag-grid-cell-selection";

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
}));

// Dash element for empty cells
const DashLine: React.FC = () => {
  const { styles } = useStyles();
  return <span className={styles.dashLine} />;
};

// Title cell with hierarchy
export const TitleCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { styles, cx } = useStyles();
  const { data, value } = props;

  if (!data) return null;

  const isVariant = data.rowType === "variant";

  return (
    <div className={styles.titleCell}>
      <span
        className={cx(
          styles.titleText,
          isVariant ? styles.variantTitle : styles.productTitle
        )}
      >
        {value || data.title}
      </span>
    </div>
  );
};

// Stock status badge
export const StockStatusRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { styles, cx } = useStyles();
  const { data } = props;

  if (!data || data.rowType === "product") return <DashLine />;

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
export const ProductStatusRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { styles, cx } = useStyles();
  const { data } = props;

  if (!data || data.rowType === "variant") return <DashLine />;

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

// Generic text cell
export const TextCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  if (shouldShowDash(data.rowType, field)) return <DashLine />;

  return (
    <SelectableCell rowId={data.id} field={field}>
      <span>{value ?? ""}</span>
    </SelectableCell>
  );
};

// Price cell
export const PriceCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  if (shouldShowDash(data.rowType, field)) {
    return (
      <div className={styles.cellContent}>
        <DashLine />
      </div>
    );
  }

  return (
    <SelectableCell rowId={data.id} field={field}>
      <div className={styles.cellContent}>
        {formatPrice(value as number | null)}
      </div>
    </SelectableCell>
  );
};

// Number cell with edit diff
export const NumberCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data, colDef, value } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  if (shouldShowDash(data.rowType, field)) {
    return (
      <div className={styles.cellContent}>
        <DashLine />
      </div>
    );
  }

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
