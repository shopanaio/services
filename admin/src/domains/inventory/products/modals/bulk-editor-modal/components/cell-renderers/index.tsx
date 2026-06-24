import React from "react";
import { Tag, Avatar } from "antd";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  IBulkEditorRow,
  IFieldEdit,
  shouldShowDash,
  formatPrice,
} from "../../types";
import { useBulkEditorStore } from "../../hooks/use-bulk-editor-store";
import { SelectableCell } from "@/shared/components/ag-grid-cell-selection";
import { Dash, Diff } from "@/shared/components/editor-grid";
import {
  ReservedCell,
  CalculatedAvailableCell,
} from "@/shared/components/inventory-cells";

function isEmptyCellValue(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

// Title cell with hierarchy
export const TitleCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data, value } = props;

  if (!data) return null;

  const isVariant = data.rowType === "variant";

  return (
    <div className="ec-title">
      <span
        className={`ec-title__text ${isVariant ? "ec-title--variant" : "ec-title--product"}`}
      >
        {value || data.title}
      </span>
    </div>
  );
};

// Reserved cell (read-only, managed by order system)
// Uses shared ReservedCell component
export const ReservedCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data, value } = props;

  if (!data || data.rowType === "product") return <Dash />;

  return <ReservedCell value={(value as number) ?? 0} />;
};

// Available cell (calculated: onHand - unavailable - reserved)
// Uses shared CalculatedAvailableCell component
export const AvailableCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || data.rowType === "product") return <Dash />;

  const onHandEdit = getFieldEdit(data.id, "onHand");
  const unavailableEdit = getFieldEdit(data.id, "unavailable");

  return (
    <CalculatedAvailableCell
      onHand={data.onHand ?? 0}
      unavailable={data.unavailable ?? 0}
      reserved={data.reserved ?? 0}
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

// Product status badge
export const ProductStatusRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data } = props;

  if (!data || data.rowType === "variant") return <Dash />;

  const status = data.productStatus;
  if (!status) return null;

  const statusConfig = {
    published: { label: "Published", color: "success" as const },
    draft: { label: "Draft", color: "warning" as const },
  };

  const config = statusConfig[status];

  return (
    <Tag color={config.color} bordered={false}>
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

  if (shouldShowDash(data.rowType, field)) return <Dash />;

  return (
    <SelectableCell rowId={data.id} field={field}>
      {isEmptyCellValue(value) ? <Dash /> : <span>{String(value)}</span>}
    </SelectableCell>
  );
};

// Price cell
export const PriceCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data, colDef, value } = props;

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  if (shouldShowDash(data.rowType, field)) {
    return (
      <div className="ec-cell ec-cell--right">
        <Dash />
      </div>
    );
  }

  return (
    <SelectableCell rowId={data.id} field={field} className="ec-cell--right">
      {isEmptyCellValue(value) ? <Dash /> : formatPrice(value as number)}
    </SelectableCell>
  );
};

// Number cell with edit diff
export const NumberCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data, colDef, value } = props;
  const getFieldEdit = useBulkEditorStore((s) => s.getFieldEdit);

  if (!data || !colDef?.field) return null;

  const field = colDef.field as keyof IBulkEditorRow;

  if (shouldShowDash(data.rowType, field)) {
    return (
      <div className="ec-cell ec-cell--right">
        <Dash />
      </div>
    );
  }

  const edit = getFieldEdit(data.id, field) as IFieldEdit<number | null> | undefined;

  return (
    <SelectableCell rowId={data.id} field={field} className="ec-cell--right">
      {edit ? (
        <Diff originalValue={edit.originalValue} currentValue={edit.currentValue} />
      ) : isEmptyCellValue(value) ? (
        <Dash />
      ) : (
        value
      )}
    </SelectableCell>
  );
};

// Media gallery cell
export const MediaCellRenderer: React.FC<
  CustomCellRendererProps<IBulkEditorRow>
> = (props) => {
  const { data } = props;

  if (!data || data.rowType === "variant") return <Dash />;

  const media = data.productMedia;
  if (!media || media.length === 0) return <Dash />;

  return (
    <Avatar.Group max={{ count: 3 }} size={32}>
      {media.map((url, index) => (
        <Avatar key={index} src={url} shape="square" />
      ))}
    </Avatar.Group>
  );
};
