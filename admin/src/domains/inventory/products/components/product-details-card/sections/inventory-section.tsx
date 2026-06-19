"use client";

import {
  Typography,
  App,
  Button,
  Tag,
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
import { useState, useCallback } from "react";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { KPITile } from "@/ui-kit/kpi-tile";
import { useInventoryStyles } from "../product-details-card.styles";
import {
  useEditVariantsModal,
  type IEditVariantsModalPayload,
} from "../../../modals";
import { ThresholdMethod } from "@/graphql/types";
import type { ApiProduct, ApiProductInventoryWidget } from "@/graphql/types";
import { getProductVariants } from "../../../utils/api-product-display";


// ============================================================================
// Sub-components
// ============================================================================

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
  onAction: (action: string) => void;
}

const InventoryHeader = ({ onAction }: IInventoryHeaderProps) => {
  return (
    <PaperHeader
      title="Inventory"
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
  product: ApiProduct;
  stats: ApiProductInventoryWidget;
}

export const InventorySection = ({
  onEdit,
  product,
  stats,
}: IInventorySectionProps) => {
  const { styles } = useInventoryStyles();
  const { message } = App.useApp();
  const { push: pushEditVariantsModal } = useEditVariantsModal();
  const [activeKPI, setActiveKPI] = useState<string | undefined>();
  const [inventoryState] = useState<InventoryState>("ready");

  const handleAction = useCallback(
    (action: string) => {
      if (action === "edit") {
        pushEditVariantsModal({
          initialTab: "inventory",
          variants: getProductVariants(product),
          productOptions: product.options,
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
            updated: Parameters<
              NonNullable<IEditVariantsModalPayload["onSave"]>
            >[0],
          ) => {
            void updated;
            message.info("Variant inventory updates are not API-backed yet");
            return false;
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
    [message, product, pushEditVariantsModal, onEdit]
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
      <InventoryHeader onAction={handleAction} />

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
        />
        <KPITile
          label="On Hand"
          tooltip="Total physical units in warehouse"
          value={stats.quantities.onHand.toLocaleString()}
          variant="success"
          active={activeKPI === "onhand"}
          onClick={() => handleKPIClick("onhand")}
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
            stats.skuStatus.lowStock.averageDays !== null
              ? `~${stats.skuStatus.lowStock.averageDays}d until stockout`
              : `${Math.round((stats.skuStatus.lowStock.count / stats.skuStatus.total) * 100)}% of catalog`
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
        />
        <KPITile
          label="Out of Stock"
          tooltip="SKUs with zero available units"
          value={`${stats.skuStatus.outOfStock.count} SKUs`}
          secondary={
            stats.skuStatus.outOfStock.averageDays !== null
              ? `for ~${stats.skuStatus.outOfStock.averageDays}d`
              : `${Math.round((stats.skuStatus.outOfStock.count / stats.skuStatus.total) * 100)}% of catalog`
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
        />
        {stats.skuStatus.backorder.count > 0 && (
          <KPITile
            label="Backorder"
            tooltip="SKUs with incoming stock expected"
            value={`${stats.skuStatus.backorder.count} SKUs`}
            secondary={
              stats.skuStatus.backorder.averageDays !== null
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
          />
        )}
      </div>
    </Paper>
  );
};
