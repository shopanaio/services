"use client";

import {
  Typography,
  Button,
  Tag,
  Select,
  Dropdown,
  Skeleton,
  Flex,
} from "antd";
import {
  MoreOutlined,
  ClockCircleFilled,
  WarningOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useState, useMemo, useCallback } from "react";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { Tile } from "../../tile";
import { useInventoryStyles } from "../product-details-card.styles";
import { useEditVariantsModal } from "../../../modals";
import type { IWarehouseStock, IInventoryStats } from "../types";
import type { IProduct } from "../../../mocks/types";

// ============================================================================
// Mock Data
// ============================================================================

const getMockWarehouseStock = (): IWarehouseStock[] => {
  const now = new Date();
  return [
    {
      warehouseId: "wh-1",
      warehouseName: "Main Warehouse",
      warehouseCode: "MAIN",
      isDefault: true,
      onHandQty: 756,
      reservedQty: 45,
      availableQty: 711,
      totalSKUs: 45,
      lowStockSKUs: 8,
      outOfStockSKUs: 4,
      backorderSKUs: 2,
      lastSyncAt: new Date(now.getTime() - 3 * 60 * 1000),
      syncStatus: "synced",
    },
    {
      warehouseId: "wh-2",
      warehouseName: "Store #1",
      warehouseCode: "ST1",
      isDefault: false,
      onHandQty: 198,
      reservedQty: 12,
      availableQty: 186,
      totalSKUs: 45,
      lowStockSKUs: 5,
      outOfStockSKUs: 3,
      backorderSKUs: 1,
      lastSyncAt: new Date(now.getTime() - 8 * 60 * 1000),
      syncStatus: "synced",
    },
    {
      warehouseId: "wh-3",
      warehouseName: "Store #2",
      warehouseCode: "ST2",
      isDefault: false,
      onHandQty: 78,
      reservedQty: 8,
      availableQty: 70,
      totalSKUs: 45,
      lowStockSKUs: 3,
      outOfStockSKUs: 2,
      backorderSKUs: 1,
      lastSyncAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      syncStatus: "stale",
    },
  ];
};

const calculateInventoryStats = (
  warehouses: IWarehouseStock[],
  selectedWarehouseId?: string
): IInventoryStats => {
  if (selectedWarehouseId) {
    const wh = warehouses.find((w) => w.warehouseId === selectedWarehouseId);
    if (wh) {
      const lowPct =
        wh.totalSKUs > 0
          ? Math.round((wh.lowStockSKUs / wh.totalSKUs) * 100)
          : 0;
      const outPct =
        wh.totalSKUs > 0
          ? Math.round((wh.outOfStockSKUs / wh.totalSKUs) * 100)
          : 0;
      return {
        availableQty: wh.availableQty,
        onHandQty: wh.onHandQty,
        reservedQty: wh.reservedQty,
        totalSKUs: wh.totalSKUs,
        lowStockSKUs: wh.lowStockSKUs,
        lowStockPercent: lowPct,
        outOfStockSKUs: wh.outOfStockSKUs,
        outOfStockPercent: outPct,
        backorderSKUs: wh.backorderSKUs,
        pendingOrders: wh.reservedQty > 0 ? Math.ceil(wh.reservedQty / 5) : 0,
        lastSyncAt: wh.lastSyncAt,
        syncStatus: wh.syncStatus,
        changeVs7d: -12,
        thresholdType: "safety_stock",
      };
    }
  }

  const totalSKUs = warehouses[0]?.totalSKUs || 0;
  const lowStockSKUs = Math.max(...warehouses.map((w) => w.lowStockSKUs));
  const outOfStockSKUs = Math.max(...warehouses.map((w) => w.outOfStockSKUs));
  const backorderSKUs = warehouses.reduce((sum, w) => sum + w.backorderSKUs, 0);

  const availableQty = warehouses.reduce((sum, w) => sum + w.availableQty, 0);
  const onHandQty = warehouses.reduce((sum, w) => sum + w.onHandQty, 0);
  const reservedQty = warehouses.reduce((sum, w) => sum + w.reservedQty, 0);

  const latestSync = warehouses.reduce(
    (latest, w) => (w.lastSyncAt > latest ? w.lastSyncAt : latest),
    warehouses[0]?.lastSyncAt || new Date()
  );
  const hasStale = warehouses.some((w) => w.syncStatus === "stale");
  const hasError = warehouses.some((w) => w.syncStatus === "error");

  return {
    availableQty,
    onHandQty,
    reservedQty,
    totalSKUs,
    lowStockSKUs,
    lowStockPercent:
      totalSKUs > 0 ? Math.round((lowStockSKUs / totalSKUs) * 100) : 0,
    outOfStockSKUs,
    outOfStockPercent:
      totalSKUs > 0 ? Math.round((outOfStockSKUs / totalSKUs) * 100) : 0,
    backorderSKUs,
    pendingOrders: reservedQty > 0 ? Math.ceil(reservedQty / 5) : 0,
    lastSyncAt: latestSync,
    syncStatus: hasError ? "error" : hasStale ? "stale" : "synced",
    changeVs7d: -12,
    thresholdType: "safety_stock",
  };
};

// ============================================================================
// Sub-components
// ============================================================================

interface IWarehouseSelectProps {
  warehouses: IWarehouseStock[];
  selectedWarehouseId?: string;
  onSelect: (warehouseId?: string) => void;
}

const WarehouseSelect = ({
  warehouses,
  selectedWarehouseId,
  onSelect,
}: IWarehouseSelectProps) => {
  const { styles } = useInventoryStyles();

  return (
    <Select
      value={selectedWarehouseId || "all"}
      onChange={(value) => onSelect(value === "all" ? undefined : value)}
      size="small"
      popupMatchSelectWidth={false}
      className={styles.warehouseSelect}
    >
      <Select.Option value="all">All Warehouses</Select.Option>
      {warehouses.map((wh) => (
        <Select.Option key={wh.warehouseId} value={wh.warehouseId}>
          {wh.warehouseName} ({wh.availableQty.toLocaleString()})
        </Select.Option>
      ))}
    </Select>
  );
};

interface IInventoryActionsProps {
  onAction: (action: string) => void;
}

const InventoryActions = ({ onAction }: IInventoryActionsProps) => {
  const items = [{ key: "edit", label: "Edit inventory" }];

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => onAction(key),
      }}
      trigger={["click"]}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

interface IInventoryHeaderProps {
  warehouses: IWarehouseStock[];
  selectedWarehouseId?: string;
  onWarehouseSelect: (warehouseId?: string) => void;
  onAction: (action: string) => void;
}

const InventoryHeader = ({
  warehouses,
  selectedWarehouseId,
  onWarehouseSelect,
  onAction,
}: IInventoryHeaderProps) => {
  return (
    <PaperHeader
      title="Inventory"
      extra={
        <WarehouseSelect
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          onSelect={onWarehouseSelect}
        />
      }
      actions={<InventoryActions onAction={onAction} />}
    />
  );
};

const InventoryLoadingSkeleton = () => {
  const { styles } = useInventoryStyles();

  return (
    <Paper className={styles.inventoryCard}>
      <Flex
        align="center"
        justify="space-between"
        style={{ marginBottom: 8, paddingBottom: 8 }}
      >
        <Flex align="center" gap={12}>
          <Skeleton.Input size="small" active style={{ width: 70 }} />
          <Skeleton.Input size="small" active style={{ width: 140 }} />
        </Flex>
        <Skeleton.Button size="small" active />
      </Flex>
      <Flex vertical gap={12}>
        <Flex gap={12}>
          <Skeleton.Node active style={{ width: "100%", height: 80 }}>
            <div />
          </Skeleton.Node>
          <Skeleton.Node active style={{ width: "100%", height: 80 }}>
            <div />
          </Skeleton.Node>
          <Skeleton.Node active style={{ width: "100%", height: 80 }}>
            <div />
          </Skeleton.Node>
        </Flex>
      </Flex>
    </Paper>
  );
};

const InventoryNoData = () => {
  const { styles } = useInventoryStyles();

  return (
    <Paper className={styles.inventoryCard}>
      <Flex
        vertical
        align="center"
        justify="center"
        gap={8}
        className={styles.noDataContainer}
      >
        <StopOutlined className={styles.noDataIcon} />
        <Typography.Text type="secondary">
          No inventory sync for this product
        </Typography.Text>
        <Button size="small" type="link">
          Set up inventory tracking
        </Button>
      </Flex>
    </Paper>
  );
};

// ============================================================================
// Main Component
// ============================================================================

type InventoryState = "loading" | "no_data" | "ready";

interface IInventorySectionProps {
  onEdit?: () => void;
  product?: IProduct;
}

export const InventorySection = ({
  onEdit,
  product,
}: IInventorySectionProps) => {
  const { styles } = useInventoryStyles();
  const warehouses = useMemo(() => getMockWarehouseStock(), []);
  const { push: pushEditVariantsModal } = useEditVariantsModal();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<
    string | undefined
  >();
  const [activeKPI, setActiveKPI] = useState<string | undefined>();
  const [inventoryState] = useState<InventoryState>("ready");

  const stats = useMemo(
    () => calculateInventoryStats(warehouses, selectedWarehouseId),
    [warehouses, selectedWarehouseId]
  );

  const handleAction = useCallback(
    (action: string) => {
      if (action === "edit" && product) {
        pushEditVariantsModal({
          initialTab: "inventory",
          variants:
            product.variants?.map((v) => ({
              id: v.id,
              title: v.title,
              sku: v.sku,
              stock: Math.floor(Math.random() * 100),
              weight: v.weight,
              weightUnit: v.weightUnit,
              barcode: null,
              options: v.options?.map((opt) => ({
                title: opt.title,
                group: {
                  slug: opt.group.slug,
                  title: opt.group.title,
                },
              })),
            })) || [],
          lowStockThreshold: 10,
          availableColumns: [
            "sku",
            "barcode",
            "onHand",
            "unavailable",
            "reserved",
            "available",
          ],
          showColumnSettings: false,
          onSave: (
            updated: Array<{
              id: string;
              sku: string | null;
              stock: number;
              barcode: string | null;
              price: number;
              compareAtPrice: number | null;
              costPrice: number | null;
              weight: number | null;
              weightUnit: string;
              length: number | null;
              width: number | null;
              height: number | null;
              dimensionUnit: string;
            }>
          ) => {
            console.log("Saved inventory:", updated);
          },
        });
      } else if (
        action === "adjust" ||
        action === "transfer" ||
        action === "reserve"
      ) {
        onEdit?.();
      }
    },
    [product, pushEditVariantsModal, onEdit]
  );

  const handleKPIClick = (kpi: string) => {
    setActiveKPI(activeKPI === kpi ? undefined : kpi);
  };

  if (inventoryState === "loading") {
    return <InventoryLoadingSkeleton />;
  }

  if (inventoryState === "no_data") {
    return <InventoryNoData />;
  }

  return (
    <Paper className={styles.inventoryCard}>
      <InventoryHeader
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onWarehouseSelect={setSelectedWarehouseId}
        onAction={handleAction}
      />

      {/* Section A: Quantity */}
      <Typography.Text
        type="secondary"
        className={styles.inventorySectionLabel}
      >
        Quantity
      </Typography.Text>
      <div className={styles.tilesGroup}>
        <Tile
          label="Available"
          tooltip="Units available for sale (On Hand minus Reserved)"
          value={stats.availableQty.toLocaleString()}
          secondary={`across ${stats.totalSKUs} SKUs`}
          isPrimary
          badge={
            <Tag color="success" className={styles.inventoryTag}>
              Sellable
            </Tag>
          }
          active={activeKPI === "available"}
          onClick={() => handleKPIClick("available")}
        />
        <Tile
          label="On Hand"
          tooltip="Total physical units in warehouse"
          value={stats.onHandQty.toLocaleString()}
          secondary={
            stats.changeVs7d !== 0
              ? `${stats.changeVs7d > 0 ? "+" : ""}${stats.changeVs7d} vs 7d`
              : undefined
          }
          variant="success"
          active={activeKPI === "onhand"}
          onClick={() => handleKPIClick("onhand")}
        />
        <Tile
          label="Reserved"
          tooltip="Units allocated to pending orders"
          value={stats.reservedQty.toLocaleString()}
          secondary={
            stats.pendingOrders > 0
              ? `${stats.pendingOrders} orders`
              : undefined
          }
          variant={stats.reservedQty > 0 ? "info" : "default"}
          badge={
            stats.reservedQty > 0 ? (
              <Tag color="blue" className={styles.inventoryTag}>
                Reserved
              </Tag>
            ) : undefined
          }
          active={activeKPI === "reserved"}
          onClick={() => handleKPIClick("reserved")}
        />
      </div>

      {/* Section B: Health */}
      <Typography.Text
        type="secondary"
        className={styles.inventorySectionLabel}
        style={{ margin: "12px 0 6px" }}
      >
        Health
      </Typography.Text>
      <div className={styles.tilesGroup}>
        <Tile
          label="Low Stock"
          tooltip={`SKUs below ${
            stats.thresholdType === "safety_stock"
              ? "safety stock"
              : "reorder point"
          } threshold`}
          value={`${stats.lowStockSKUs} SKUs`}
          secondary={`${stats.lowStockPercent}% of catalog`}
          variant={stats.lowStockSKUs > 0 ? "warning" : "default"}
          badge={
            stats.lowStockSKUs > 0 ? (
              <WarningOutlined
                className={styles.colorWarning}
                style={{ fontSize: 11 }}
              />
            ) : undefined
          }
          active={activeKPI === "lowstock"}
          onClick={() => handleKPIClick("lowstock")}
        />
        <Tile
          label="Out of Stock"
          tooltip="SKUs with zero available units"
          value={`${stats.outOfStockSKUs} SKUs`}
          secondary={`${stats.outOfStockPercent}% of catalog`}
          variant={stats.outOfStockSKUs > 0 ? "danger" : "default"}
          badge={
            stats.outOfStockSKUs > 0 ? (
              <StopOutlined
                className={styles.colorError}
                style={{ fontSize: 11 }}
              />
            ) : undefined
          }
          active={activeKPI === "outofstock"}
          onClick={() => handleKPIClick("outofstock")}
        />
        {stats.backorderSKUs > 0 && (
          <Tile
            label="Backorder"
            tooltip="SKUs with incoming stock expected"
            value={`${stats.backorderSKUs} SKUs`}
            secondary="ETA avg 5d"
            variant="purple"
            badge={
              <ClockCircleFilled
                className={styles.colorPurple}
                style={{ fontSize: 11 }}
              />
            }
            active={activeKPI === "backorder"}
            onClick={() => handleKPIClick("backorder")}
          />
        )}
      </div>
    </Paper>
  );
};
