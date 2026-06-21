"use client";

import { Flex, Statistic, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import type {
  ApiWarehouse,
  ApiWarehouseStockConnection,
} from "@/graphql/types";
import { WarehouseDefaultTag } from "../warehouse-default-tag";
import {
  ActivitySection,
  IdentitySection,
  StockSection,
} from "./sections";

const useStyles = createStyles(({ token }) => ({
  header: {
    padding: token.padding,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: token.paddingSM,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "1fr",
    },
  },
  metric: {
    padding: token.padding,
    borderRadius: token.borderRadius,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

interface WarehouseDetailsCardProps {
  warehouse: ApiWarehouse;
  onStockPageChange?: (direction: "next" | "prev") => void;
  onEditIdentity: () => void;
  onEditDefault: () => void;
  onDelete: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function WarehouseDetailsCard({
  warehouse,
  onStockPageChange,
  onEditIdentity,
  onEditDefault,
  onDelete,
}: WarehouseDetailsCardProps) {
  const { styles } = useStyles();
  const stockConnection = warehouse.stock as ApiWarehouseStockConnection;
  const stockRows = stockConnection.edges.map((edge) => edge.node);

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      <Flex vertical gap={8} className={styles.header}>
        <Flex align="center" justify="space-between" gap={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {warehouse.name}
          </Typography.Title>
          <WarehouseDefaultTag isDefault={warehouse.isDefault} />
        </Flex>
        <Flex align="center" gap={12} wrap="wrap">
          <Typography.Text type="secondary" className={styles.code}>
            {warehouse.code}
          </Typography.Text>
          <Typography.Text type="secondary">
            Created {formatDate(warehouse.createdAt)}
          </Typography.Text>
          <Typography.Text type="secondary">
            Updated {formatDate(warehouse.updatedAt)}
          </Typography.Text>
        </Flex>
      </Flex>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <Statistic
            title="Stocked variants"
            value={warehouse.variantsCount}
          />
        </div>
        <div className={styles.metric}>
          <Statistic title="Stock records" value={stockConnection.totalCount} />
        </div>
        <div className={styles.metric}>
          <Typography.Text type="secondary">Default behavior</Typography.Text>
          <div style={{ marginTop: 8 }}>
            {warehouse.isDefault ? (
              <Tag color="processing">Used for fallback</Tag>
            ) : (
              <Tag>Not default</Tag>
            )}
          </div>
        </div>
      </div>

      <IdentitySection
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

      <ActivitySection warehouse={warehouse} />
    </Flex>
  );
}
