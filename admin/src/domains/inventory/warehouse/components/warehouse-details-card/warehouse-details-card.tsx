"use client";

import { Button, Divider, Dropdown, Flex, Tag, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import type {
  ApiWarehouse,
  ApiWarehouseStockConnection,
} from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { WarehouseDefaultTag } from "../warehouse-default-tag";
import { StockSection } from "./sections";

const useStyles = createStyles(({ token }) => ({
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },
  metaText: {
    fontSize: token.fontSizeSM,
  },
  warehouseTitle: {},
  divider: {
    marginBlock: token.margin,
  },
  metrics: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  kpiTile: {
    padding: "12px 16px",
    background: token.colorBgElevated,
    minWidth: 180,
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
  const actionItems: MenuProps["items"] = [
    {
      key: "edit-identity",
      label: "Edit identity",
      icon: <EditOutlined />,
      onClick: onEditIdentity,
    },
    {
      key: "edit-default",
      label: warehouse.isDefault ? "Default settings" : "Set as default",
      icon: <CheckCircleOutlined />,
      onClick: onEditDefault,
    },
    {
      type: "divider",
    },
    {
      key: "delete",
      label: "Delete warehouse",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: onDelete,
    },
  ];
  const statusTitle = (
    <Flex align="center" gap={8}>
      <Tag className={styles.statusTag}>Warehouse</Tag>
      <WarehouseDefaultTag isDefault={warehouse.isDefault} />
      <Typography.Text type="secondary" className={styles.metaText}>
        Updated {formatDate(warehouse.updatedAt)}
      </Typography.Text>
    </Flex>
  );
  const topBarActions = (
    <Dropdown menu={{ items: actionItems }} trigger={["click"]}>
      <Button
        size="small"
        icon={<MoreOutlined />}
        data-testid="warehouse-details-actions-button"
      />
    </Dropdown>
  );

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      <Paper>
        <PaperHeader title={statusTitle} actions={topBarActions} />

        <Flex vertical gap={8}>
          <Typography.Title
            level={3}
            ellipsis={{ rows: 2, tooltip: warehouse.name }}
            className={styles.warehouseTitle}
            style={{ margin: 0 }}
            data-testid="warehouse-detail-title"
          >
            {warehouse.name || "Untitled Warehouse"}
          </Typography.Title>

          <Flex align="center" gap={12} wrap="wrap">
            <CopyableChip label="Code" value={warehouse.code} mono />
            <CopyableChip
              label="ID"
              value={warehouse.id}
              displayValue={warehouse.id.slice(0, 8)}
              mono
            />
          </Flex>
        </Flex>

        <Divider className={styles.divider} />

        <Flex align="center" gap={12} wrap="wrap">
          <Typography.Text type="secondary">
            Created {formatDate(warehouse.createdAt)}
          </Typography.Text>
          <Typography.Text type="secondary">
            Updated {formatDate(warehouse.updatedAt)}
          </Typography.Text>
        </Flex>

        <div className={styles.metrics} style={{ marginTop: 12 }}>
          <KPITile
            label="Stocked variants"
            value={warehouse.variantsCount}
            tooltip="Variants with stock records in this warehouse"
            className={styles.kpiTile}
          />
          <KPITile
            label="Stock records"
            value={stockConnection.totalCount}
            tooltip="Warehouse stock rows for this warehouse"
            className={styles.kpiTile}
          />
        </div>
      </Paper>

      <StockSection
        stock={stockRows}
        pageInfo={stockConnection.pageInfo}
        totalCount={stockConnection.totalCount}
        onPageChange={onStockPageChange}
      />
    </Flex>
  );
}
