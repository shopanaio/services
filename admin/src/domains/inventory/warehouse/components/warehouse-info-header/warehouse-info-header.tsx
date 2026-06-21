"use client";

import { useState } from "react";
import { Button, Divider, Dropdown, Flex, Popover, Tag, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { ApiWarehouse } from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { formatDetailDate } from "@/domains/inventory/utils/format-detail-date";
import { PeriodSwitch } from "@/domains/inventory/products/components/period-switch";
import { UserPopoverContent } from "@/domains/inventory/products/components/product-info-header/components";
import { PERIODS, type Period } from "@/domains/inventory/products/utils/periods";
import { WarehouseDefaultTag } from "../warehouse-default-tag";
import { useWarehouseInfoHeaderStyles } from "./warehouse-info-header.styles";

interface WarehouseInfoHeaderProps {
  warehouse: ApiWarehouse;
  onEditIdentity: () => void;
  onEditDefault: () => void;
  onDelete: () => void;
}

export function WarehouseInfoHeader({
  warehouse,
  onEditIdentity,
  onEditDefault,
  onDelete,
}: WarehouseInfoHeaderProps) {
  const { styles } = useWarehouseInfoHeaderStyles();
  const [kpiPeriod, setKpiPeriod] = useState<Period>("7d");
  const [compareEnabled, setCompareEnabled] = useState(false);
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
          <PeriodSwitch
            periods={PERIODS}
            value={kpiPeriod}
            onChange={setKpiPeriod}
            showCompare
            compareEnabled={compareEnabled}
            onCompareChange={setCompareEnabled}
          />
        </div>

        <Flex gap={12}>
          <KPITile
            label="On hand units"
            value="1,248"
            trend={compareEnabled ? 6 : undefined}
            tooltip="Total units physically stored in this warehouse"
            className={styles.kpiTile}
          />
          <KPITile
            label="Available units"
            value="1,032"
            trend={compareEnabled ? 4 : undefined}
            tooltip="Units available for sale after reservations and unavailable stock"
            className={styles.kpiTile}
          />
          <KPITile
            label="Low stock"
            value="7"
            trend={compareEnabled ? -2 : undefined}
            tooltip="Variants below the replenishment threshold"
            className={styles.kpiTile}
          />
        </Flex>
      </div>
    </Paper>
  );
}
