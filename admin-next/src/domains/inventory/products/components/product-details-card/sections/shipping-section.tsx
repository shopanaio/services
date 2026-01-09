"use client";

import { Tag, Flex } from "antd";
import { Paper } from "../../paper";
import { PaperHeader } from "../../paper-header";
import { EditAction } from "../../edit-action";
import { Tile } from "../../tile";
import { weightUnitOptions, dimensionUnitOptions } from "../../../constants";

interface IShippingSectionProps {
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
  requiresShipping: boolean;
  onEdit: () => void;
}

export const ShippingSection = ({
  weight,
  weightUnit,
  length,
  width,
  height,
  dimensionUnit,
  requiresShipping,
  onEdit,
}: IShippingSectionProps) => {
  const formatWeight = (w: number | null, unit: string) => {
    if (!w) return "\u2014";
    return `${w} ${
      weightUnitOptions[unit as keyof typeof weightUnitOptions]?.label || unit
    }`;
  };

  const formatDimensions = (
    l: number | null,
    w: number | null,
    h: number | null,
    unit: string
  ) => {
    if (!l && !w && !h) return "\u2014";
    const u =
      dimensionUnitOptions[unit as keyof typeof dimensionUnitOptions]?.label ||
      unit;
    return `${l || 0} \u00d7 ${w || 0} \u00d7 ${h || 0} ${u}`;
  };

  return (
    <Paper>
      <PaperHeader
        title="Shipping & Dimensions"
        actions={<EditAction onEdit={onEdit} label="Edit shipping" />}
      />
      <Flex gap={8}>
        <Tile
          label="Weight"
          value={formatWeight(weight, weightUnit)}
          variant="success"
          centered
        />
        <Tile
          label="Dimensions"
          value={formatDimensions(length, width, height, dimensionUnit)}
          variant="info"
          centered
        />
        <Tile
          label="Shipping"
          value={requiresShipping ? "Required" : "Not required"}
          variant={requiresShipping ? "purple" : "default"}
          badge={
            <Tag
              color={requiresShipping ? "blue" : "default"}
              style={{ margin: 0 }}
              variant="outlined"
            >
              {requiresShipping ? "Active" : "Disabled"}
            </Tag>
          }
          centered
        />
      </Flex>
    </Paper>
  );
};
