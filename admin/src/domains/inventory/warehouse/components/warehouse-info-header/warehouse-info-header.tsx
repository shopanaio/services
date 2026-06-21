"use client";

import { Button, Divider, Dropdown, Flex, Popover, Tag, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type {
  ApiWarehouse,
  ApiWarehouseStockConnection,
} from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { UserPopoverContent } from "@/domains/inventory/products/components/product-info-header/components";
import { WarehouseDefaultTag } from "../warehouse-default-tag";
import { useWarehouseInfoHeaderStyles } from "./warehouse-info-header.styles";

interface WarehouseInfoHeaderProps {
  warehouse: ApiWarehouse;
  stockConnection: ApiWarehouseStockConnection;
  onEditIdentity: () => void;
  onEditDefault: () => void;
  onDelete: () => void;
}

export function WarehouseInfoHeader({
  warehouse,
  stockConnection,
  onEditIdentity,
  onEditDefault,
  onDelete,
}: WarehouseInfoHeaderProps) {
  const { styles } = useWarehouseInfoHeaderStyles();
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
      {!warehouse.isDefault && (
        <Tag className={styles.statusTag}>Warehouse</Tag>
      )}
      <WarehouseDefaultTag isDefault={warehouse.isDefault} />
      <Typography.Text type="secondary" className={styles.metaText}>
        Updated {formatDetailDate(warehouse.updatedAt)}
        <span style={{ marginLeft: 4 }}>by</span>
        <Popover
          content={
            <UserPopoverContent
              firstName="Admin"
              lastName="User"
              email="admin@shopana.io"
            />
          }
          placement="bottom"
          arrow={false}
        >
          <Button
            variant="text"
            color="primary"
            style={{
              padding: 0,
              height: "auto",
              marginLeft: 4,
              fontSize: "inherit",
            }}
          >
            Admin
          </Button>
        </Popover>
      </Typography.Text>
    </Flex>
  );

  const topBarActions = (
    <Flex align="center" gap={12}>
      <Dropdown menu={{ items: actionItems }} trigger={["click"]}>
        <Button
          size="small"
          icon={<MoreOutlined />}
          data-testid="warehouse-details-actions-button"
        />
      </Dropdown>
    </Flex>
  );

  return (
    <Paper>
      {/* TOP BAR */}
      <PaperHeader title={statusTitle} actions={topBarActions} />

      {/* TITLE SECTION */}
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

        <Flex align="center" gap={12}>
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

      {/* KPI PANEL */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <Flex align="center" gap={12} wrap="wrap">
            <Typography.Text type="secondary">
              Created {formatDetailDate(warehouse.createdAt)}
            </Typography.Text>
            <Typography.Text type="secondary">
              Updated {formatDetailDate(warehouse.updatedAt)}
            </Typography.Text>
          </Flex>
        </div>

        <Flex gap={12}>
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
        </Flex>
      </div>
    </Paper>
  );
}
