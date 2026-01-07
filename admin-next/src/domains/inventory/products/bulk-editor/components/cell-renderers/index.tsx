import React from "react";
import { createStyles, cx } from "antd-style";
import { Tag, Tooltip } from "antd";
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
  newValueNegative: {
    fontWeight: 600,
    color: token.colorError,
  },
  zeroValue: {
    color: token.colorError,
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

// Reserved cell (read-only, managed by order system)
export const ReservedCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data, value } = props;

  if (!data || data.rowType === "product") return <DashLine />;

  return (
    <Tooltip title="Managed by order system">
      <div className={styles.cellContent}>{value ?? 0}</div>
    </Tooltip>
  );
};

// Available cell (calculated: onHand - unavailable - reserved)
// Shows diff when onHand or unavailable is edited
export const AvailableCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || data.rowType === "product") return <DashLine />;

  // Get current values
  const onHand = data.onHand ?? 0;
  const unavailable = data.unavailable ?? 0;
  const reserved = data.reserved ?? 0;
  const currentAvailable = onHand - unavailable - reserved;

  // Check if any inventory field was edited
  const onHandEdit = getFieldEdit(data.id, "onHand");
  const unavailableEdit = getFieldEdit(data.id, "unavailable");

  // If any field was changed, calculate original available
  if (onHandEdit || unavailableEdit) {
    const origOnHand = onHandEdit
      ? (onHandEdit.originalValue as number) ?? 0
      : onHand;
    const origUnavailable = unavailableEdit
      ? (unavailableEdit.originalValue as number) ?? 0
      : unavailable;
    const originalAvailable = origOnHand - origUnavailable - reserved;

    // Recalculate current available with edits
    const currOnHand = onHandEdit
      ? (onHandEdit.currentValue as number) ?? 0
      : onHand;
    const currUnavailable = unavailableEdit
      ? (unavailableEdit.currentValue as number) ?? 0
      : unavailable;
    const newAvailable = currOnHand - currUnavailable - reserved;

    if (originalAvailable !== newAvailable) {
      const isNegative = newAvailable < 0;

      return (
        <div className={styles.editedValue}>
          <span className={styles.originalValue}>{originalAvailable}</span>
          <span className={styles.arrow}>→</span>
          <span
            className={cx(
              styles.newValue,
              isNegative && styles.newValueNegative
            )}
          >
            {newAvailable}
          </span>
        </div>
      );
    }
  }

  // Default display
  if (currentAvailable === 0) {
    return <div className={cx(styles.cellContent, styles.zeroValue)}>0</div>;
  }

  return <div className={styles.cellContent}>{currentAvailable}</div>;
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
