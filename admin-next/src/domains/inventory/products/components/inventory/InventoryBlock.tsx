"use client";

import { createStyles } from "antd-style";
import { Typography, Button, Tag, Dropdown, Flex, Progress } from "antd";
import { MoreOutlined, WarningOutlined } from "@ant-design/icons";
import { useMemo, useCallback } from "react";
import { Paper } from "../Paper";
import { PaperHeader } from "../PaperHeader";
import { Tile } from "../Tile";
import { useEditVariantInventoryModal } from "../../modals";

// ============================================================================
// Types
// ============================================================================

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

interface IVariantInventory {
  id: string;
  title: string;
  sku?: string | null;
  stock?: number;
  weight?: number | null;
  weightUnit?: string;
  barcode?: string | null;
  options?: Array<{
    title: string;
    group: {
      slug: string;
      title: string;
    };
  }>;
}

interface IInventoryData {
  totalStock: number;
  totalVariants: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockHealth: number; // percentage 0-100
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  card: {
    padding: 16,
    minHeight: "auto",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginBottom: 16,
    "@media (max-width: 768px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  statTile: {
    textAlign: "center",
    minHeight: 56,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  healthSection: {
    padding: 12,
    background: token.colorBgContainer,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  healthLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
    marginBottom: 8,
    display: "block",
  },
  statusRow: {
    display: "flex",
    gap: 8,
    marginTop: 12,
  },
  statusTag: {
    margin: 0,
  },
  warningIcon: {
    color: token.colorWarning,
    marginRight: 4,
  },
}));

// ============================================================================
// Helpers
// ============================================================================

const getStockStatus = (stock: number, threshold: number = 10): StockStatus => {
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
};

const calculateInventoryData = (
  variants: IVariantInventory[],
  lowStockThreshold: number
): IInventoryData => {
  const totalStock = variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  const totalVariants = variants.length;

  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  variants.forEach((v) => {
    const status = getStockStatus(v.stock ?? 0, lowStockThreshold);
    if (status === "in_stock") inStockCount++;
    else if (status === "low_stock") lowStockCount++;
    else outOfStockCount++;
  });

  const stockHealth =
    totalVariants > 0
      ? Math.round((inStockCount / totalVariants) * 100)
      : 0;

  return {
    totalStock,
    totalVariants,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    stockHealth,
  };
};

// ============================================================================
// Sub-components
// ============================================================================

interface IInventoryHeaderProps {
  title: string;
  onMoreAction?: (action: string) => void;
}

const InventoryHeader = ({ title, onMoreAction }: IInventoryHeaderProps) => {
  const moreMenuItems = [
    { key: "edit", label: "Edit inventory" },
    { key: "adjust", label: "Adjust stock" },
    { key: "transfer", label: "Transfer stock" },
    { type: "divider" as const },
    { key: "history", label: "View history" },
    { key: "export", label: "Export data" },
  ];

  const actionsDropdown = onMoreAction ? (
    <Dropdown
      menu={{
        items: moreMenuItems,
        onClick: ({ key }) => onMoreAction(key),
      }}
      trigger={["click"]}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  ) : undefined;

  return <PaperHeader title={title} actions={actionsDropdown} />;
};

// ============================================================================
// Main Component
// ============================================================================

interface IInventoryBlockProps {
  variants?: IVariantInventory[];
  title?: string;
  lowStockThreshold?: number;
  onMoreAction?: (action: string) => void;
}

export const InventoryBlock = ({
  variants = [],
  title = "Inventory",
  lowStockThreshold = 10,
  onMoreAction,
}: IInventoryBlockProps) => {
  const { styles } = useStyles();
  const { push: pushEditInventoryModal } = useEditVariantInventoryModal();

  const inventoryData = useMemo(
    () => calculateInventoryData(variants, lowStockThreshold),
    [variants, lowStockThreshold]
  );

  const handleMoreAction = useCallback(
    (action: string) => {
      if (action === "edit") {
        pushEditInventoryModal({
          variants: variants.map((v) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            stock: v.stock,
            weight: v.weight,
            weightUnit: v.weightUnit,
            barcode: v.barcode,
            options: v.options,
          })),
          lowStockThreshold,
          onSave: (updatedVariants: Array<{ id: string; sku: string | null; stock: number; weight: number | null; weightUnit: string; barcode: string | null }>) => {
            console.log("Updated inventory:", updatedVariants);
          },
        });
      } else {
        onMoreAction?.(action);
      }
    },
    [pushEditInventoryModal, variants, lowStockThreshold, onMoreAction]
  );

  const healthColor =
    inventoryData.stockHealth >= 80
      ? "success"
      : inventoryData.stockHealth >= 50
      ? "normal"
      : "exception";

  return (
    <Paper className={styles.card}>
      <InventoryHeader title={title} onMoreAction={handleMoreAction} />

      <div className={styles.statsRow}>
        <Tile
          label="Total Stock"
          value={String(inventoryData.totalStock)}
          tooltip="Total units across all variants"
          centered
          className={styles.statTile}
        />
        <Tile
          label="Variants"
          value={String(inventoryData.totalVariants)}
          tooltip="Number of product variants"
          centered
          className={styles.statTile}
        />
        <Tile
          label="In Stock"
          value={String(inventoryData.inStockCount)}
          tooltip="Variants with sufficient stock"
          centered
          className={styles.statTile}
          variant="success"
        />
        <Tile
          label="Low/Out"
          value={`${inventoryData.lowStockCount}/${inventoryData.outOfStockCount}`}
          tooltip="Low stock / Out of stock variants"
          centered
          className={styles.statTile}
          variant={
            inventoryData.outOfStockCount > 0
              ? "danger"
              : inventoryData.lowStockCount > 0
              ? "warning"
              : undefined
          }
        />
      </div>

      <div className={styles.healthSection}>
        <Typography.Text className={styles.healthLabel}>
          Stock Health
        </Typography.Text>
        <Progress
          percent={inventoryData.stockHealth}
          status={healthColor}
          strokeColor={
            healthColor === "success"
              ? undefined
              : healthColor === "normal"
              ? "#faad14"
              : undefined
          }
        />
        <div className={styles.statusRow}>
          <Tag color="success" className={styles.statusTag}>
            In Stock: {inventoryData.inStockCount}
          </Tag>
          {inventoryData.lowStockCount > 0 && (
            <Tag color="warning" className={styles.statusTag}>
              <WarningOutlined className={styles.warningIcon} />
              Low: {inventoryData.lowStockCount}
            </Tag>
          )}
          {inventoryData.outOfStockCount > 0 && (
            <Tag color="error" className={styles.statusTag}>
              Out: {inventoryData.outOfStockCount}
            </Tag>
          )}
        </div>
      </div>
    </Paper>
  );
};

export type { IVariantInventory, IInventoryData, StockStatus };
