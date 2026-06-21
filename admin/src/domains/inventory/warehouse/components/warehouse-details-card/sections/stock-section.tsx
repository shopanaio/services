"use client";

import { Button, Empty, Flex, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiPageInfo, ApiWarehouseStock } from "@/graphql/types";

interface StockSectionProps {
  stock: ApiWarehouseStock[];
  pageInfo: ApiPageInfo | null;
  totalCount: number;
  onPageChange?: (direction: "next" | "prev") => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

const columns: ColumnsType<ApiWarehouseStock> = [
  {
    title: "Product / Variant",
    key: "variant",
    render: (_, row) => (
      <Flex vertical gap={2}>
        <Typography.Text strong>{row.variant.title}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {row.variant.handle}
        </Typography.Text>
      </Flex>
    ),
  },
  {
    title: "On hand",
    dataIndex: "quantityOnHand",
    align: "right",
    width: 110,
  },
  {
    title: "Reserved",
    dataIndex: "reservedQuantity",
    align: "right",
    width: 110,
  },
  {
    title: "Unavailable",
    dataIndex: "unavailableQuantity",
    align: "right",
    width: 120,
  },
  {
    title: "Available",
    dataIndex: "availableForSale",
    align: "right",
    width: 110,
  },
  {
    title: "Updated",
    dataIndex: "updatedAt",
    width: 140,
    render: (value: string) => formatDate(value),
  },
];

export function StockSection({
  stock,
  pageInfo,
  totalCount,
  onPageChange,
}: StockSectionProps) {
  return (
    <Paper>
      <PaperHeader
        title="Stock"
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {totalCount} records
          </Typography.Text>
        }
      />

      <Table<ApiWarehouseStock>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={stock}
        pagination={false}
        scroll={{ x: 760 }}
        locale={{
          emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />,
        }}
      />

      <Flex justify="flex-end" align="center" gap={8} style={{ paddingTop: 12 }}>
        <Button
          size="small"
          disabled={!pageInfo?.hasPreviousPage}
          onClick={() => onPageChange?.("prev")}
        >
          Prev
        </Button>
        <Button
          size="small"
          disabled={!pageInfo?.hasNextPage}
          onClick={() => onPageChange?.("next")}
        >
          Next
        </Button>
      </Flex>
    </Paper>
  );
}
