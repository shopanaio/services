"use client";

import { Tag, Flex } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { KPITile } from "@/ui-kit/kpi-tile";

interface IShippingSectionProps {
  onEdit: () => void;
}

export const ShippingSection = ({
  onEdit,
}: IShippingSectionProps) => {
  return (
    <Paper>
      <PaperHeader
        title="Shipping & Dimensions"
        actions={<EditAction onEdit={onEdit} label="Edit shipping" />}
      />
      <Flex gap={8}>
        <KPITile
          label="Weight"
          value="0 g"
          variant="success"
          centered
        />
        <KPITile
          label="Dimensions"
          value="0 x 0 x 0 mm"
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
