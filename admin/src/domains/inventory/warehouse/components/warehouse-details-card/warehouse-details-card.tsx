"use client";

import { Flex } from "antd";
import type { ApiWarehouse } from "@/graphql/types";
import { WarehouseInfoHeader } from "../warehouse-info-header";

interface WarehouseDetailsCardProps {
  warehouse: ApiWarehouse;
  onEditIdentity: () => void;
  onEditDefault: () => void;
  onDelete: () => void;
}

export function WarehouseDetailsCard({
  warehouse,
  onEditIdentity,
  onEditDefault,
  onDelete,
}: WarehouseDetailsCardProps) {
  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      <WarehouseInfoHeader
        warehouse={warehouse}
        onEditIdentity={onEditIdentity}
        onEditDefault={onEditDefault}
        onDelete={onDelete}
      />
    </Flex>
  );
}
