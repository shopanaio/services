import React from "react";
import { createStyles, cx } from "antd-style";
import { Tooltip, Image } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import { SelectableCell } from "@/shared/components/ag-grid-cell-selection";
import type { IVariantEditorRow } from "../config";
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
  newValueNegative: {
    fontWeight: 600,
    color: token.colorError,
  },
  zeroValue: {
    color: token.colorError,
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
// Reserved Cell (read-only, managed by order system)
// ============================================================================

export const ReservedCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data, value } = props;

  if (!data) return null;

  return (
    <Tooltip title="Managed by order system">
      <div className={styles.cellContent}>{value ?? 0}</div>
    </Tooltip>
  );
};

// ============================================================================
// Available Cell (calculated: onHand - unavailable - reserved)
// Shows diff when onHand or unavailable is edited
// ============================================================================

export const AvailableCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { styles } = useStyles();
  const { data } = props;
  const getFieldEdit = useVariantsEditorStore((s) => s.getFieldEdit);

  if (!data) return null;

  // Get current available (already calculated with edits applied via valueGetter)
  const currentAvailable = data.available;

  // Check if any inventory field was edited
  const onHandEdit = getFieldEdit(data.id, "onHand");
  const unavailableEdit = getFieldEdit(data.id, "unavailable");

  // If any field was changed, calculate original available
  if (onHandEdit || unavailableEdit) {
    const origOnHand = onHandEdit
      ? (onHandEdit.originalValue as number)
      : data.onHand;
    const origUnavailable = unavailableEdit
      ? (unavailableEdit.originalValue as number)
      : data.unavailable;
    const originalAvailable = origOnHand - origUnavailable - data.reserved;

    // Recalculate current available with edits
    const currOnHand = onHandEdit
      ? (onHandEdit.currentValue as number)
      : data.onHand;
    const currUnavailable = unavailableEdit
      ? (unavailableEdit.currentValue as number)
      : data.unavailable;
    const newAvailable = currOnHand - currUnavailable - data.reserved;

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
