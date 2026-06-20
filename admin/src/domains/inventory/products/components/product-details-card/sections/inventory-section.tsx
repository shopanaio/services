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
import { useDefaultCurrency } from "@/domains/workspace";
import { useInventoryStyles } from "../product-details-card.styles";
import { useEditVariantsModal } from "../../../modals";
import { ThresholdMethod } from "@/graphql/types";
import type {
  ApiInventoryItemUpdateInput,
  ApiProduct,
  ApiVariant,
} from "@/graphql/types";
import { useDefaultWarehouse } from "../../../hooks/use-default-warehouse";
import { useEnsureVariantInventoryItems } from "../../../hooks/use-ensure-variant-inventory-items";
import { useProductInventoryWidget } from "../../../hooks/use-product-inventory-widget";
import { useProductVariantsLoader } from "../../../hooks/use-product-variants-loader";
import { useUpdateInventoryItems } from "../../../hooks/use-update-inventory-items";
import { prepareChangedVariantInventoryInputs } from "../../../mappers/product-variant-inventory.mapper";
import type { VariantEditorSaveRow } from "../../../mappers/product-variant-editor.mapper";

// ============================================================================
// Sub-components
// ============================================================================

interface IInventoryActionsProps {
  onAction: (action: string) => void;
  isPreparingEditor?: boolean;
}

const InventoryActions = ({
  onAction,
  isPreparingEditor = false,
}: IInventoryActionsProps) => {
  const items = [
    { key: "edit", label: "Edit inventory", disabled: isPreparingEditor },
  ];

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => onAction(key),
      }}
      trigger={["click"]}
    >
      <Button size="small" icon={<MoreOutlined />} loading={isPreparingEditor} />
    </Dropdown>
  );
};

interface IInventoryHeaderProps {
  onAction: (action: string) => void;
  isPreparingEditor?: boolean;
}

const InventoryHeader = ({
  onAction,
  isPreparingEditor,
}: IInventoryHeaderProps) => {
  return (
    <PaperHeader
      title="Inventory"
      actions={
        <InventoryActions
          onAction={onAction}
          isPreparingEditor={isPreparingEditor}
        />
      }
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
  onEdit?: () => void;
  product: ApiProduct;
  onProductRefresh?: () => Promise<unknown>;
}

export const InventorySection = ({
  onEdit,
  product,
  onProductRefresh,
}: IInventorySectionProps) => {
  const { styles } = useInventoryStyles();
  const { message } = App.useApp();
  const defaultCurrency = useDefaultCurrency();
  const { push: pushEditVariantsModal } = useEditVariantsModal();
  const { loadAllProductVariants } = useProductVariantsLoader();
  const {
    defaultWarehouse,
    refetch: refetchDefaultWarehouse,
  } = useDefaultWarehouse();
  const { ensureVariantInventoryItems } = useEnsureVariantInventoryItems();
  const { updateInventoryItems } = useUpdateInventoryItems();
  const {
    data: stats,
    isLoading,
    error,
    refetch: refetchInventoryWidget,
  } = useProductInventoryWidget({ productId: product.id });
  const [activeKPI, setActiveKPI] = useState<string | undefined>();
  const [isPreparingEditor, setIsPreparingEditor] = useState(false);

  const handleSaveInventory = useCallback(
    async (
      rows: VariantEditorSaveRow[],
      editorVariants: ApiVariant[],
      warehouseId: string | null,
    ): Promise<boolean> => {
      if (!warehouseId) {
        message.error("Default warehouse is required to save inventory.");
        return false;
      }

      let inputs: ApiInventoryItemUpdateInput[];

      try {
        inputs = prepareChangedVariantInventoryInputs({
          rows,
          variants: editorVariants,
          warehouseId,
          defaultCurrency,
        });
      } catch (err) {
        message.error(
          err instanceof Error ? err.message : "Variant inventory is invalid.",
        );
        return false;
      }

      if (inputs.length === 0) {
        message.info("No inventory changes to save");
        return true;
      }

      const result = await updateInventoryItems(inputs);

      if (result.errors.length > 0) {
        message.error(
          result.errors[0].message || "Inventory updates could not be saved.",
        );
        return false;
      }

      const refreshResults = await Promise.allSettled([
        onProductRefresh?.(),
        refetchInventoryWidget(),
        loadAllProductVariants(product),
      ]);
      const refreshFailed = refreshResults.some(
        (refreshResult) => refreshResult.status === "rejected",
      );

      if (refreshFailed) {
        message.warning("Inventory updated, but refresh failed");
      } else {
        message.success("Inventory updated");
      }

      return true;
    },
    [
      defaultCurrency,
      loadAllProductVariants,
      message,
      onProductRefresh,
      product,
      refetchInventoryWidget,
      updateInventoryItems,
    ],
  );

  const handleEditInventory = useCallback(async () => {
    setIsPreparingEditor(true);

    try {
      const editorVariants = await loadAllProductVariants(product);
      const hydratedVariants =
        await ensureVariantInventoryItems(editorVariants);
      const resolvedDefaultWarehouse =
        defaultWarehouse ?? (await refetchDefaultWarehouse());

      if (!resolvedDefaultWarehouse) {
        message.error("Default warehouse is required to edit inventory.");
        return;
      }

      pushEditVariantsModal({
        productId: product.id,
        initialTab: "inventory",
        variants: hydratedVariants,
        productOptions: product.options,
        defaultCurrency,
        variantEditorScope: {
          type: "inventory",
          warehouseId: resolvedDefaultWarehouse.id,
        },
        availableColumns: [
          "sku",
          "onHand",
          "unavailable",
          "reserved",
          "available",
        ],
        showColumnSettings: false,
        onSave: (rows: VariantEditorSaveRow[]) =>
          handleSaveInventory(
            rows,
            hydratedVariants,
            resolvedDefaultWarehouse.id,
          ),
      });
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : "Product inventory could not be prepared",
      );
    } finally {
      setIsPreparingEditor(false);
    }
  }, [
    defaultCurrency,
    defaultWarehouse,
    ensureVariantInventoryItems,
    handleSaveInventory,
    loadAllProductVariants,
    message,
    product,
    pushEditVariantsModal,
    refetchDefaultWarehouse,
  ]);

  const handleAction = useCallback(
    (action: string) => {
      if (action === "edit") {
        void handleEditInventory();
      } else if (
        action === "adjust" ||
        action === "transfer" ||
        action === "reserve"
      ) {
        onEdit?.();
      }
    },
    [handleEditInventory, onEdit],
  );

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
    <Paper className={styles.inventoryCard}>
      <InventoryHeader
        onAction={handleAction}
        isPreparingEditor={isPreparingEditor}
      />

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
          />
        )}
      </div>
    </Paper>
  );
};
