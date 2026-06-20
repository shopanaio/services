import React from "react";
import { Avatar } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import { SelectableCell } from "@/shared/components/ag-grid-cell-selection";
import { Dash, Diff, ImagePlaceholder } from "@/shared/components/editor-grid";
import type { IVariantEditorRow } from "../config/types";
import { useVariantsEditorStore } from "../hooks";
import type { IFieldEdit } from "@/shared/components/editor-grid/types";
import type { CurrencyCode } from "@/graphql/types";
import {
  ReservedCell,
  CalculatedAvailableCell,
} from "@/shared/components/inventory-cells";
import { formatPrice } from "../../../utils/price-formatting";

export { formatPrice };

interface PriceCellRendererParams {
  currency?: CurrencyCode | null;
}

function getPriceCellDisplayValue(
  value: unknown,
  currency: CurrencyCode | null | undefined,
): React.ReactNode {
  if (!currency) {
    return <Dash />;
  }

  if (typeof value !== "number") {
    return <Dash />;
  }

  return formatPrice(value, currency);
}

// ============================================================================
// Image Cell
// ============================================================================

export const ImageCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { data } = props;

  if (!data) return null;

  const media = data.media;
  if (!media || media.length === 0) return <ImagePlaceholder />;

  return (
    <Avatar.Group max={{ count: 3 }} size={32}>
      {media.map((url, index) => (
        <Avatar key={index} src={url} shape="square" />
      ))}
    </Avatar.Group>
  );
};

// ============================================================================
// Title Cell
// ============================================================================

export const TitleCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { data } = props;

  if (!data) return null;

  return (
    <div className="ec-title">
      <span className="ec-title__text">{data.title}</span>
    </div>
  );
};

// ============================================================================
// Reserved Cell (read-only, managed by order system)
// Uses shared ReservedCell component
// ============================================================================

export const ReservedCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { data, value } = props;
  if (!data) return null;
  return (
    <ReservedCell
      value={(value as number) ?? 0}
      testId={`variants-editor-cell-reserved-${data.id}`}
    />
  );
};

// ============================================================================
// Available Cell (calculated: onHand - unavailable - reserved)
// Uses shared CalculatedAvailableCell component
// ============================================================================

export const AvailableCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { data } = props;
  const getFieldEdit = useVariantsEditorStore((s) => s.getFieldEdit);

  if (!data) return null;

  const onHandEdit = getFieldEdit(data.id, "onHand");
  const unavailableEdit = getFieldEdit(data.id, "unavailable");

  return (
    <CalculatedAvailableCell
      onHand={data.onHand}
      unavailable={data.unavailable}
      reserved={data.reserved}
      onHandEdit={
        onHandEdit
          ? {
              originalValue: onHandEdit.originalValue as number,
              currentValue: onHandEdit.currentValue as number,
            }
          : undefined
      }
      unavailableEdit={
        unavailableEdit
          ? {
              originalValue: unavailableEdit.originalValue as number,
              currentValue: unavailableEdit.currentValue as number,
            }
          : undefined
      }
      testId={`variants-editor-cell-available-${data.id}`}
    />
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
    <SelectableCell
      rowId={data.id}
      field={field}
      testId={`variants-editor-cell-${field}-${data.id}`}
    >
      <span>{value ?? ""}</span>
    </SelectableCell>
  );
};

// ============================================================================
// Price Cell
// ============================================================================

export const PriceCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow> & PriceCellRendererParams
> = (props) => {
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field;
  const displayValue = getPriceCellDisplayValue(value, props.currency);

  return (
    <SelectableCell
      rowId={data.id}
      field={field}
      className="ec-cell--right"
      testId={`variants-editor-cell-${field}-${data.id}`}
    >
      {displayValue}
    </SelectableCell>
  );
};

// ============================================================================
// Number Cell (with edit diff)
// ============================================================================

export const NumberCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow>
> = (props) => {
  const { data, colDef, value } = props;
  const getFieldEdit = useVariantsEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field;
  const edit = getFieldEdit(data.id, field) as
    | IFieldEdit<number | null>
    | undefined;

  return (
    <SelectableCell
      rowId={data.id}
      field={field}
      className="ec-cell--right"
      testId={`variants-editor-cell-${field}-${data.id}`}
    >
      {edit ? (
        <Diff
          originalValue={edit.originalValue}
          currentValue={edit.currentValue}
        />
      ) : (
        value ?? ""
      )}
    </SelectableCell>
  );
};

// ============================================================================
// Option Cell (read-only, displays option value)
// ============================================================================

export const OptionCellRenderer: React.FC<
  CustomCellRendererProps<IVariantEditorRow> & { optionName: string }
> = (props) => {
  const { data, optionName } = props;

  if (!data) return null;

  const option = data.options.find((o) => o.name === optionName);
  const value = option?.value ?? "";

  return <span className="ec-option">{value}</span>;
};
