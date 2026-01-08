import React from "react";
import { Image } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import { SelectableCell } from "@/shared/components/ag-grid-cell-selection";
import { Diff, ImagePlaceholder } from "@/shared/components/editor-grid";
import type { IVariantEditorRow } from "../config";
import { useVariantsEditorStore } from "../hooks";
import type { IFieldEdit } from "@/shared/components/editor-grid";
import {
  ReservedCell,
  CalculatedAvailableCell,
} from "@/shared/components/inventory-cells";

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
  const { data } = props;

  if (!data) return null;

  return (
    <div className="ec-cell ec-cell--center">
      {data.imageUrl ? (
        <Image
          src={data.imageUrl}
          alt={data.title}
          width={40}
          height={40}
          className="ec-image"
          preview={false}
        />
      ) : (
        <ImagePlaceholder />
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
  return <ReservedCell value={(value as number) ?? 0} />;
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
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field;

  return (
    <SelectableCell rowId={data.id} field={field} className="ec-cell--right">
      {formatPrice(value as number | null)}
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
    <SelectableCell rowId={data.id} field={field} className="ec-cell--right">
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
