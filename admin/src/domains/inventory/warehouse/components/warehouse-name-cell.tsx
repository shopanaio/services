"use client";

import { Flex, Typography } from "antd";
import type { ApiWarehouse } from "@/graphql/types";
import { WarehouseDefaultTag } from "./warehouse-default-tag";

interface WarehouseNameCellProps {
  warehouse: ApiWarehouse;
}

export function WarehouseNameCell({ warehouse }: WarehouseNameCellProps) {
  return (
    <Flex vertical gap={2} style={{ minWidth: 0 }}>
      <Flex align="center" gap={8} style={{ minWidth: 0 }}>
        <Typography.Text strong ellipsis>
          {warehouse.name}
        </Typography.Text>
        <WarehouseDefaultTag isDefault={warehouse.isDefault} />
      </Flex>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {warehouse.code}
      </Typography.Text>
    </Flex>
  );
}
