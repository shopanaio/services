"use client";

import { Flex } from "antd";
import type {
  ApiWarehouse,
  ApiWarehouseStockConnection,
} from "@/graphql/types";
import { WarehouseInfoHeader } from "../warehouse-info-header";
import { StockSection } from "./sections";

interface WarehouseDetailsCardProps {
  warehouse: ApiWarehouse;
  onStockPageChange?: (direction: "next" | "prev") => void;
  onEditIdentity: () => void;
  onEditDefault: () => void;
  onDelete: () => void;
}

export function WarehouseDetailsCard({
  warehouse,
  onStockPageChange,
  onEditIdentity,
  onEditDefault,
  onDelete,
}: WarehouseDetailsCardProps) {
  const stockConnection = warehouse.stock as ApiWarehouseStockConnection;
  const stockRows = stockConnection.edges.map((edge) => edge.node);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      <WarehouseInfoHeader
        warehouse={warehouse}
        onEditIdentity={onEditIdentity}
        onEditDefault={onEditDefault}
        onDelete={onDelete}
      />

      <StockSection
        stock={stockRows}
        pageInfo={stockConnection.pageInfo}
        totalCount={stockConnection.totalCount}
        onPageChange={onStockPageChange}
      />
    </Flex>
  );
}
