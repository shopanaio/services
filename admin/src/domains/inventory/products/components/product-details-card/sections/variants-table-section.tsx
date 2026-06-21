"use client";

import { Typography, Button, Image, Dropdown, Flex } from "antd";
import {
  MoreOutlined,
  SortAscendingOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "../../edit-action";
import { useVariantsTableStyles } from "../product-details-card.styles";
import type {
  ApiVariant,
  ApiPageInfo,
  ApiProductOption,
  CurrencyCode,
} from "@/graphql/types";
import { formatPrice } from "../../../utils/price-formatting";
import {
  getSelectedOptionLabels,
  getVariantStockQuantity,
} from "../../../utils/api-product-display";
import {
  formatApiDimensions,
  formatApiWeight,
} from "../../../utils/product-measurements";

// ============================================================================
// Stock Status Config
// ============================================================================

const stockStatusConfig: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  IN_STOCK: {
    icon: "\u25cf",
    color: "var(--ant-color-success)",
    label: "In Stock",
  },
  LOW_STOCK: {
    icon: "\u25cb",
    color: "var(--ant-color-warning)",
    label: "Low Stock",
  },
  OUT_OF_STOCK: {
    icon: "\u2715",
    color: "var(--ant-color-error)",
    label: "Out of Stock",
  },
  ON_BACKORDER: {
    icon: "\u25d0",
    color: "var(--ant-purple)",
    label: "Backorder",
  },
};

// ============================================================================
// Helpers
// ============================================================================

const getStockStatus = (variant: ApiVariant): string => {
  const totalStock = getVariantStockQuantity(variant);

  if (totalStock === 0) return "OUT_OF_STOCK";
  if (totalStock < 10) return "LOW_STOCK";
  return "IN_STOCK";
};

// ============================================================================
// Sub-components
// ============================================================================

interface IVariantRowProps {
  variant: ApiVariant;
  productOptions: ApiProductOption[];
  defaultCurrency: CurrencyCode | null;
  onAction: (action: string, variantId: string) => void;
}

const VariantRow = ({
  variant,
  productOptions,
  defaultCurrency,
  onAction,
}: IVariantRowProps) => {
  const { styles } = useVariantsTableStyles();

  const price = variant.price?.amountMinor ?? null;
  const compareAtPrice = variant.price?.compareAtMinor ?? null;
  const formattedPrice =
    price !== null && defaultCurrency
      ? formatPrice(price, defaultCurrency)
      : "\u2014";
  const discountPercent =
    price !== null && compareAtPrice !== null && compareAtPrice > price
      ? Math.round((1 - Number(price) / Number(compareAtPrice)) * 100)
      : 0;

  const stockStatus = getStockStatus(variant);
  const stockConfig = stockStatusConfig[stockStatus] || {
    icon: "\u25cb",
    color: "var(--ant-color-border)",
    label: "N/A",
  };

  const imageUrl = [...variant.media].sort(
    (left, right) => left.sortIndex - right.sortIndex,
  )[0]?.file.url;
  const inventoryItem = variant.inventoryItem;
  const optionLabels = getSelectedOptionLabels(productOptions, variant);

  return (
    <tr>
      {/* VARIANT */}
      <td>
        <Flex align="flex-start" gap={8}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              width={40}
              height={40}
              className={styles.variantImage}
              preview={false}
            />
          ) : (
            <div className={styles.variantImagePlaceholder} />
          )}
          <Flex vertical>
            <Typography.Text strong className={styles.variantTitle}>
              {variant.title ?? variant.handle}
            </Typography.Text>
            {optionLabels.length > 0 && (
              <Typography.Text
                type="secondary"
                className={styles.variantOptions}
              >
                {optionLabels.join(" / ")}
              </Typography.Text>
            )}
          </Flex>
        </Flex>
      </td>

      {/* PRICING */}
      <td>
        <Flex vertical gap={0}>
          <Typography.Text>
            {formattedPrice}
          </Typography.Text>
          {compareAtPrice !== null &&
            compareAtPrice > 0 &&
            price !== null &&
            defaultCurrency &&
            compareAtPrice !== price && (
              <Flex align="center" gap={4}>
                <Typography.Text
                  type="secondary"
                  className={styles.priceStrikethrough}
                >
                  {formatPrice(compareAtPrice, defaultCurrency)}
                </Typography.Text>
                {discountPercent > 0 && (
                  <Typography.Text className={styles.discountPercent}>
                    -{discountPercent}%
                  </Typography.Text>
                )}
              </Flex>
            )}
        </Flex>
      </td>

      {/* INVENTORY */}
      <td>
        <Flex vertical>
          <Typography.Text className={styles.variantSku}>
            {inventoryItem?.sku ?? "\u2014"}
          </Typography.Text>
          <Flex align="center" gap={4}>
            <span
              className={styles.stockIcon}
              style={{ color: stockConfig.color }}
            >
              {stockConfig.icon}
            </span>
            <Typography.Text
              className={styles.stockLabel}
              style={{ color: stockConfig.color }}
            >
              {stockConfig.label}
            </Typography.Text>
          </Flex>
        </Flex>
      </td>

      {/* ATTRIBUTES */}
      <td>
        <Flex vertical>
          <Typography.Text style={{ fontSize: 12 }}>
            {formatApiWeight(inventoryItem?.weight)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {formatApiDimensions(inventoryItem?.dimensions)}
          </Typography.Text>
        </Flex>
      </td>

      {/* ACTIONS */}
      <td style={{ textAlign: "center" }}>
        <Dropdown
          menu={{
            items: [
              { key: "edit", label: "Edit" },
              { key: "duplicate", label: "Duplicate" },
              { type: "divider" },
              { key: "delete", label: "Delete", danger: true },
            ],
            onClick: ({ key }) => onAction(key, variant.id),
          }}
          trigger={["click"]}
        >
          <Button size="small" type="text" icon={<MoreOutlined />} />
        </Dropdown>
      </td>
    </tr>
  );
};

// ============================================================================
// Sort Menu Items
// ============================================================================

const sortMenuItems = [
  { key: "name_asc", label: "Name A \u2192 Z" },
  { key: "name_desc", label: "Name Z \u2192 A" },
  { type: "divider" as const },
  { key: "price_asc", label: "Price: Low \u2192 High" },
  { key: "price_desc", label: "Price: High \u2192 Low" },
  { type: "divider" as const },
  { key: "stock_asc", label: "Stock: Low \u2192 High" },
  { key: "stock_desc", label: "Stock: High \u2192 Low" },
  { type: "divider" as const },
  { key: "created_desc", label: "Newest first" },
  { key: "created_asc", label: "Oldest first" },
];

// ============================================================================
// Main Component
// ============================================================================

interface IVariantsTableSectionProps {
  variants: ApiVariant[];
  productOptions: ApiProductOption[];
  pageInfo: ApiPageInfo;
  totalCount: number;
  defaultCurrency: CurrencyCode | null;
  onEdit: () => void | Promise<void>;
  onSort?: (sortKey: string) => void;
  onVariantAction?: (action: string, variantId: string) => void;
  onPageChange?: (direction: "next" | "prev") => void;
  isPageLoading?: boolean;
  isEditLoading?: boolean;
}

export const VariantsTableSection = ({
  variants,
  productOptions,
  pageInfo,
  totalCount,
  defaultCurrency,
  onEdit,
  onSort,
  onVariantAction,
  onPageChange,
  isPageLoading = false,
  isEditLoading = false,
}: IVariantsTableSectionProps) => {
  const { styles } = useVariantsTableStyles();

  const handleSort = (key: string) => {
    onSort?.(key);
  };

  const handleVariantAction = (action: string, variantId: string) => {
    onVariantAction?.(action, variantId);
  };

  return (
    <Paper>
      <PaperHeader
        title="Variants"
        actions={
          <Flex gap={12}>
            <Dropdown
              menu={{
                items: sortMenuItems,
                onClick: ({ key }) => handleSort(key),
              }}
              trigger={["click"]}
            >
              <Button
                variant="text"
                color="default"
                size="small"
                icon={<SortAscendingOutlined />}
              />
            </Dropdown>
            <EditAction
              label="Edit variants"
              onEdit={onEdit}
              loading={isEditLoading}
              disabled={isEditLoading}
            />
          </Flex>
        }
      />
      <div style={{ overflowX: "auto", margin: "0 -12px", padding: "0 12px" }}>
        <table className={styles.variantsTable}>
          <thead>
            <tr>
              <th>Variant</th>
              <th>Pricing</th>
              <th>Inventory</th>
              <th>Attributes</th>
              <th style={{ width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {variants.length > 0 ? (
              variants.map((variant) => (
                <VariantRow
                  key={variant.id}
                  variant={variant}
                  productOptions={productOptions}
                  defaultCurrency={defaultCurrency}
                  onAction={handleVariantAction}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <Flex justify="center" style={{ padding: "24px 12px" }}>
                    <Typography.Text type="secondary">
                      No variants on this page
                    </Typography.Text>
                  </Flex>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <Flex
        justify="space-between"
        align="center"
        className={styles.variantsPagination}
      >
        <Typography.Text
          type="secondary"
          className={styles.variantsPaginationCount}
        >
          {totalCount} variant{totalCount !== 1 ? "s" : ""}
          {isPageLoading ? " - Loading" : ""}
        </Typography.Text>
        <Flex gap={4}>
          <Button
            size="small"
            type="text"
            icon={<LeftOutlined />}
            disabled={isPageLoading || !pageInfo.hasPreviousPage}
            loading={isPageLoading}
            onClick={() => onPageChange?.("prev")}
          />
          <Button
            size="small"
            type="text"
            icon={<RightOutlined />}
            disabled={isPageLoading || !pageInfo.hasNextPage}
            loading={isPageLoading}
            onClick={() => onPageChange?.("next")}
          />
        </Flex>
      </Flex>
    </Paper>
  );
};
