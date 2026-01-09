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
import { weightUnitOptions, dimensionUnitOptions } from "../../../constants";
import type { IVariantForTable } from "../types";

// ============================================================================
// Stock Status Config
// ============================================================================

const stockStatusConfig: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  IN_STOCK: {
    icon: "\u25cf",
    color: "#52c41a",
    label: "In Stock",
  },
  LOW_STOCK: {
    icon: "\u25cb",
    color: "#faad14",
    label: "Low Stock",
  },
  OUT_OF_STOCK: {
    icon: "\u2715",
    color: "#ff4d4f",
    label: "Out of Stock",
  },
  ON_BACKORDER: {
    icon: "\u25d0",
    color: "#722ed1",
    label: "Backorder",
  },
};

// ============================================================================
// Sub-components
// ============================================================================

interface IVariantRowProps {
  variant: IVariantForTable;
  formatPrice: (price: number) => string;
  onAction: (action: string, variantId: string) => void;
}

const VariantRow = ({ variant, formatPrice, onAction }: IVariantRowProps) => {
  const { styles } = useVariantsTableStyles();

  const discountPercent =
    variant.oldPrice && variant.oldPrice > variant.price
      ? Math.round((1 - variant.price / variant.oldPrice) * 100)
      : 0;

  const stockConfig = stockStatusConfig[variant.stockStatus] || {
    icon: "\u25cb",
    color: "var(--ant-color-border)",
    label: variant.stockStatus || "N/A",
  };

  return (
    <tr>
      {/* VARIANT */}
      <td>
        <Flex align="flex-start" gap={8}>
          {variant.gallery?.[0] ? (
            <Image
              src={variant.gallery[0].url}
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
              {variant.title || variant.sku || "\u2014"}
            </Typography.Text>
            {variant.options && variant.options.length > 0 && (
              <Typography.Text
                type="secondary"
                className={styles.variantOptions}
              >
                {variant.options.map((o) => o.title).join(" / ")}
              </Typography.Text>
            )}
          </Flex>
        </Flex>
      </td>

      {/* PRICING */}
      <td>
        <Flex vertical gap={0}>
          <Typography.Text>{formatPrice(variant.price)}</Typography.Text>
          {variant.oldPrice &&
            variant.oldPrice > 0 &&
            variant.oldPrice !== variant.price && (
              <Flex align="center" gap={4}>
                <Typography.Text
                  type="secondary"
                  className={styles.priceStrikethrough}
                >
                  {formatPrice(variant.oldPrice)}
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
            {variant.sku || "\u2014"}
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
            {variant.weight
              ? `${variant.weight} ${
                  weightUnitOptions[
                    variant.weightUnit as keyof typeof weightUnitOptions
                  ]?.label ||
                  variant.weightUnit ||
                  ""
                }`
              : "\u2014"}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {variant.length || variant.width || variant.height
              ? `${variant.length || 0} \u00d7 ${variant.width || 0} \u00d7 ${
                  variant.height || 0
                } ${
                  dimensionUnitOptions[
                    variant.dimensionUnit as keyof typeof dimensionUnitOptions
                  ]?.label ||
                  variant.dimensionUnit ||
                  ""
                }`
              : "\u2014"}
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
  variants: IVariantForTable[];
  formatPrice: (price: number) => string;
  onEdit: () => void;
  onSort?: (sortKey: string) => void;
  onVariantAction?: (action: string, variantId: string) => void;
}

export const VariantsTableSection = ({
  variants,
  formatPrice,
  onEdit,
  onSort,
  onVariantAction,
}: IVariantsTableSectionProps) => {
  const { styles } = useVariantsTableStyles();

  if (!variants || variants.length === 0) {
    return null;
  }

  const handleSort = (key: string) => {
    console.log("Sort variants:", key);
    onSort?.(key);
  };

  const handleVariantAction = (action: string, variantId: string) => {
    console.log("Variant action:", action, variantId);
    onVariantAction?.(action, variantId);
  };

  return (
    <Paper>
      <PaperHeader
        title="Variants"
        actions={
          <Flex gap={8}>
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
            <EditAction label="Edit variants" onEdit={onEdit} />
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
            {variants.map((variant) => (
              <VariantRow
                key={variant.id}
                variant={variant}
                formatPrice={formatPrice}
                onAction={handleVariantAction}
              />
            ))}
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
          {variants.length} variants
        </Typography.Text>
        <Flex gap={4}>
          <Button size="small" type="text" icon={<LeftOutlined />} disabled />
          <Button size="small" type="text" icon={<RightOutlined />} />
        </Flex>
      </Flex>
    </Paper>
  );
};
