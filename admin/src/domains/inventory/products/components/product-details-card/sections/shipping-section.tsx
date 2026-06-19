"use client";

import { Tag, Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { KPITile } from "@/ui-kit/kpi-tile";
import type { ApiVariant } from "@/graphql/types";
import {
  formatApiDimensions,
  formatApiWeight,
} from "../../../utils/product-measurements";

interface IShippingSectionProps {
  variant: ApiVariant | null;
  onEdit: () => void;
}

export const ShippingSection = ({
  variant,
  onEdit,
}: IShippingSectionProps) => {
  const inventoryItem = variant?.inventoryItem ?? null;

  return (
    <Paper>
      <PaperHeader
        title="Shipping & Dimensions"
        actions={<EditAction onEdit={onEdit} label="Edit shipping" />}
      />
      <Flex gap={8}>
        <KPITile
          label="Weight"
          value={formatApiWeight(inventoryItem?.weight)}
          variant="success"
          centered
        />
        <KPITile
          label="Dimensions"
          value={formatApiDimensions(inventoryItem?.dimensions)}
          variant="info"
          centered
        />
        <KPITile
          label="Shipping"
          value="Not configured"
          variant="default"
          badge={
            <Tag color="default" style={{ margin: 0 }}>
              Unknown
            </Tag>
          }
          centered
        />
      </Flex>
    </Paper>
  );
};
