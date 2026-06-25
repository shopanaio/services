"use client";

import {
  Typography,
  Button,
  Tag,
  Skeleton,
  Flex,
} from "antd";
import {
  ClockCircleFilled,
  WarningOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { KPITile } from "@/ui-kit/kpi-tile";
import { useInventoryStyles } from "../product-details-card.styles";
import { ThresholdMethod } from "@/graphql/types";
import type { ApiProduct } from "@/graphql/types";
import { useProductInventoryWidget } from "../../../hooks/use-product-inventory-widget";

// ============================================================================
// Sub-components
// ============================================================================

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

const InventoryError = ({ message }: { message: string }) => {
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
        <WarningOutlined className={styles.colorError} />
        <Typography.Text type="secondary">
          Inventory data could not be loaded
        </Typography.Text>
        <Typography.Text type="secondary">{message}</Typography.Text>
      </Flex>
    </Paper>
  );
};

function formatSkuPercent(count: number, total: number): string {
  if (total <= 0) {
    return "0% of catalog";
  }

  return `${Math.round((count / total) * 100)}% of catalog`;
}

// ============================================================================
// Main Component
// ============================================================================

interface IInventorySectionProps {
  product: ApiProduct;
}

export const InventorySection = ({
  product,
}: IInventorySectionProps) => {
  const { styles } = useInventoryStyles();
  const {
    data: stats,
    isLoading,
    error,
  } = useProductInventoryWidget({ productId: product.id });
  const [activeKPI, setActiveKPI] = useState<string | undefined>();

  const handleKPIClick = (kpi: string) => {
    setActiveKPI(activeKPI === kpi ? undefined : kpi);
  };

  if (isLoading && !stats) {
    return <InventoryLoadingSkeleton />;
  }

  if (error) {
    return <InventoryError message={error.message} />;
  }

  if (!stats) {
    return <InventoryNoData />;
  }

  return (
    <Paper className={styles.inventoryCard} data-testid="inventory-widget">
      <PaperHeader title="Inventory" />

      {/* Section A: Quantity */}
      <Typography.Text
        type="secondary"
        className={styles.inventorySectionLabel}
      >
        Quantity
      </Typography.Text>
      <div className={styles.tilesGroup}>
        <KPITile
          label="Available"
          tooltip="Units available for sale (On Hand minus Reserved)"
          value={stats.quantities.availableForSale.toLocaleString()}
          secondary={
            stats.availableChange7d !== 0
              ? `${stats.availableChange7d > 0 ? "+" : ""}${
                  stats.availableChange7d
                } vs 7d`
              : `across ${stats.skuStatus.total} SKUs`
          }
          isPrimary
          badge={
            <Tag color="success" className={styles.inventoryTag}>
              Sellable
            </Tag>
          }
          active={activeKPI === "available"}
          onClick={() => handleKPIClick("available")}
          dataTestId="inventory-widget-kpi-available"
        />
        <KPITile
          label="On Hand"
          tooltip="Total physical units in warehouse"
          value={stats.quantities.onHand.toLocaleString()}
          variant="success"
          active={activeKPI === "onhand"}
          onClick={() => handleKPIClick("onhand")}
          dataTestId="inventory-widget-kpi-on-hand"
        />
        <KPITile
          label="Reserved"
          tooltip="Units allocated to pending orders"
          value={stats.quantities.reserved.toLocaleString()}
          variant={stats.quantities.reserved > 0 ? "info" : "default"}
          badge={
            stats.quantities.reserved > 0 ? (
              <Tag color="blue" className={styles.inventoryTag}>
                Reserved
              </Tag>
            ) : undefined
          }
          active={activeKPI === "reserved"}
          onClick={() => handleKPIClick("reserved")}
          dataTestId="inventory-widget-kpi-reserved"
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
        <KPITile
          label="Low Stock"
          tooltip={`SKUs below ${
            stats.alertThreshold.method === ThresholdMethod.SafetyStock
              ? "safety stock"
              : "reorder point"
          } threshold`}
          value={`${stats.skuStatus.lowStock.count} SKUs`}
          secondary={
            stats.skuStatus.lowStock.averageDays != null
              ? `~${stats.skuStatus.lowStock.averageDays}d until stockout`
              : formatSkuPercent(
                  stats.skuStatus.lowStock.count,
                  stats.skuStatus.total,
                )
          }
          variant={stats.skuStatus.lowStock.count > 0 ? "warning" : "default"}
          badge={
            stats.skuStatus.lowStock.count > 0 ? (
              <WarningOutlined
                className={styles.colorWarning}
                style={{ fontSize: 11 }}
              />
            ) : undefined
          }
          active={activeKPI === "lowstock"}
          onClick={() => handleKPIClick("lowstock")}
          dataTestId="inventory-widget-kpi-low-stock"
        />
        <KPITile
          label="Out of Stock"
          tooltip="SKUs with zero available units"
          value={`${stats.skuStatus.outOfStock.count} SKUs`}
          secondary={
            stats.skuStatus.outOfStock.averageDays != null
              ? `for ~${stats.skuStatus.outOfStock.averageDays}d`
              : formatSkuPercent(
                  stats.skuStatus.outOfStock.count,
                  stats.skuStatus.total,
                )
          }
          variant={stats.skuStatus.outOfStock.count > 0 ? "danger" : "default"}
          badge={
            stats.skuStatus.outOfStock.count > 0 ? (
              <StopOutlined
                className={styles.colorError}
                style={{ fontSize: 11 }}
              />
            ) : undefined
          }
          active={activeKPI === "outofstock"}
          onClick={() => handleKPIClick("outofstock")}
          dataTestId="inventory-widget-kpi-out-of-stock"
        />
        {stats.skuStatus.backorder.count > 0 && (
          <KPITile
            label="Backorder"
            tooltip="SKUs with incoming stock expected"
            value={`${stats.skuStatus.backorder.count} SKUs`}
            secondary={
              stats.skuStatus.backorder.averageDays != null
                ? `ETA avg ${stats.skuStatus.backorder.averageDays}d`
                : undefined
            }
            variant="purple"
            badge={
              <ClockCircleFilled
                className={styles.colorPurple}
                style={{ fontSize: 11 }}
              />
            }
            active={activeKPI === "backorder"}
            onClick={() => handleKPIClick("backorder")}
            dataTestId="inventory-widget-kpi-backorder"
          />
        )}
      </div>
    </Paper>
  );
};
