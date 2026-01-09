"use client";

import { useState, useMemo, useCallback } from "react";
import { createStyles } from "antd-style";
import {
  Typography,
  Radio,
  Checkbox,
  Select,
  Tag,
  Image,
} from "antd";
import {
  GiftOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";

import {
  type IComponentGroup,
  type IComponentItem,
  type DisplayStyle,
  ComponentItemType,
  ComponentPriceType,
} from "../types";
import { getProductById, getVariantById, formatPrice } from "../mocks/mock-data";

// ============================================================================
// Types
// ============================================================================

interface IPreviewTabProps {
  groups: IComponentGroup[];
  displayStyle: DisplayStyle;
  showImages: boolean;
  showSku: boolean;
  showStock: boolean;
  showComparePrice: boolean;
}

interface ISelectedItems {
  [groupId: string]: string[];
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  previewWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: 24,
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorder}`,
    minHeight: 500,
  },
  previewContainer: {
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadius,
    boxShadow: token.boxShadowSecondary,
    overflow: "hidden",
    width: "100%",
    maxWidth: 800,
  },
  storefrontHeader: {
    padding: "16px 20px",
    borderBottom: `1px solid ${token.colorBorder}`,
  },
  storefrontContent: {
    padding: 20,
  },
  groupSection: {
    marginBottom: 20,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  groupIcon: {
    fontSize: 16,
    color: token.colorPrimary,
  },
  groupTitle: {
    fontWeight: 600,
    fontSize: 15,
  },
  requiredBadge: {
    fontSize: 11,
    marginLeft: 4,
  },
  groupDescription: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 12,
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  itemCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorder}`,
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
      backgroundColor: "rgba(22, 119, 255, 0.02)",
    },
  },
  itemCardSelected: {
    borderColor: token.colorPrimary,
    backgroundColor: "rgba(22, 119, 255, 0.04)",
  },
  itemCardDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    "&:hover": {
      borderColor: token.colorBorder,
      backgroundColor: "transparent",
    },
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: token.borderRadiusSM,
    objectFit: "cover",
    backgroundColor: token.colorBgLayout,
    flexShrink: 0,
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: token.borderRadiusSM,
    backgroundColor: token.colorBgLayout,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorTextSecondary,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontWeight: 500,
    marginBottom: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  itemMeta: {
    fontSize: 12,
    color: token.colorTextSecondary,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  itemPricing: {
    textAlign: "right",
    flexShrink: 0,
  },
  itemPrice: {
    fontWeight: 600,
    fontSize: 14,
  },
  itemPriceFree: {
    color: token.colorSuccess,
  },
  itemPriceIncluded: {
    color: token.colorTextSecondary,
  },
  itemComparePrice: {
    fontSize: 12,
    color: token.colorTextSecondary,
    textDecoration: "line-through",
  },
  variantSelect: {
    marginTop: 8,
    width: "100%",
  },
  summarySection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadius,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    fontSize: 13,
  },
  summaryRowTotal: {
    borderTop: `1px solid ${token.colorBorder}`,
    marginTop: 8,
    paddingTop: 12,
    fontSize: 16,
    fontWeight: 600,
  },
  summaryLabel: {
    color: token.colorTextSecondary,
  },
  summaryValue: {
    fontFamily: "monospace",
  },
  summaryDiscount: {
    color: token.colorSuccess,
  },
  emptyGroup: {
    padding: "20px 16px",
    textAlign: "center",
    color: token.colorTextSecondary,
    border: `1px dashed ${token.colorBorder}`,
    borderRadius: token.borderRadius,
  },
  checkboxWrapper: {
    marginRight: 8,
  },
  radioWrapper: {
    marginRight: 8,
  },
  selectionInfo: {
    fontSize: 11,
    color: token.colorTextSecondary,
    marginTop: 4,
  },
}));

// ============================================================================
// Group Icons
// ============================================================================

const GROUP_ICONS: Record<string, React.ReactNode> = {
  accessories: <ShoppingOutlined />,
  warranty: <SafetyCertificateOutlined />,
  "gift-wrap": <GiftOutlined />,
};

// ============================================================================
// Helper Functions
// ============================================================================

const getItemTitle = (item: IComponentItem): string => {
  if (item.customTitle) return item.customTitle;

  if (item.itemType === ComponentItemType.SINGLE_VARIANT && item.variantId) {
    const variant = getVariantById(item.productId, item.variantId);
    if (variant) return variant.title;
  }

  const product = getProductById(item.productId);
  return product?.title ?? "Unknown Product";
};

const getItemImage = (item: IComponentItem): string | null => {
  if (item.customImage?.url) return item.customImage.url;

  if (item.itemType === ComponentItemType.SINGLE_VARIANT && item.variantId) {
    const variant = getVariantById(item.productId, item.variantId);
    if (variant?.imageUrl) return variant.imageUrl;
  }

  const product = getProductById(item.productId);
  return product?.imageUrl ?? null;
};

const getItemSku = (item: IComponentItem): string => {
  if (item.itemType === ComponentItemType.SINGLE_VARIANT && item.variantId) {
    const variant = getVariantById(item.productId, item.variantId);
    if (variant) return variant.sku;
  }

  const product = getProductById(item.productId);
  return product?.sku ?? "";
};

const formatPriceDisplay = (
  item: IComponentItem,
  showComparePrice: boolean
): { price: string; comparePrice?: string; isFree: boolean; isIncluded: boolean } => {
  const isFree = item.priceType === ComponentPriceType.FREE;
  const isIncluded = item.priceType === ComponentPriceType.INCLUDED;

  if (isFree) {
    return { price: "Free", isFree: true, isIncluded: false };
  }

  if (isIncluded) {
    return { price: "Included", isFree: false, isIncluded: true };
  }

  const hasRange = item.finalPriceMax && item.finalPriceMax !== item.finalPrice;
  const price = hasRange
    ? `${formatPrice(item.finalPrice)} - ${formatPrice(item.finalPriceMax!)}`
    : formatPrice(item.finalPrice);

  let comparePrice: string | undefined;
  if (showComparePrice && item.basePrice !== item.finalPrice) {
    const hasBaseRange = item.basePriceMax && item.basePriceMax !== item.basePrice;
    comparePrice = hasBaseRange
      ? `${formatPrice(item.basePrice)} - ${formatPrice(item.basePriceMax!)}`
      : formatPrice(item.basePrice);
  }

  return { price, comparePrice, isFree: false, isIncluded: false };
};

// ============================================================================
// Storefront Item Component
// ============================================================================

interface IStorefrontItemProps {
  item: IComponentItem;
  isSelected: boolean;
  isMultiple: boolean;
  onSelect: () => void;
  showImages: boolean;
  showSku: boolean;
  showStock: boolean;
  showComparePrice: boolean;
}

const StorefrontItem = ({
  item,
  isSelected,
  isMultiple,
  onSelect,
  showImages,
  showSku,
  showStock,
  showComparePrice,
}: IStorefrontItemProps) => {
  const { styles, cx } = useStyles();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const product = getProductById(item.productId);
  const hasVariants = item.itemType === ComponentItemType.PRODUCT_WITH_VARIANTS && product?.variants;

  // Get selected variant data if applicable
  const selectedVariant = useMemo(() => {
    if (hasVariants && selectedVariantId) {
      return getVariantById(item.productId, selectedVariantId);
    }
    return null;
  }, [hasVariants, selectedVariantId, item.productId]);

  const title = getItemTitle(item);
  const image = selectedVariant?.imageUrl ?? getItemImage(item);
  const sku = hasVariants
    ? (selectedVariant?.sku ?? null)
    : getItemSku(item);
  const { price, comparePrice, isFree, isIncluded } = formatPriceDisplay(item, showComparePrice);

  const availableVariants = useMemo(() => {
    if (!hasVariants || !product?.variants) return [];
    if (!item.availableVariantIds) return product.variants;
    return product.variants.filter((v) => item.availableVariantIds?.includes(v.id));
  }, [hasVariants, product, item.availableVariantIds]);

  const handleClick = useCallback(() => {
    if (!item.isAvailable) return;
    onSelect();
  }, [item.isAvailable, onSelect]);

  return (
    <div
      className={cx(
        styles.itemCard,
        isSelected && styles.itemCardSelected,
        !item.isAvailable && styles.itemCardDisabled
      )}
      onClick={handleClick}
    >
      {/* Selection indicator */}
      <div className={isMultiple ? styles.checkboxWrapper : styles.radioWrapper}>
        {isMultiple ? (
          <Checkbox checked={isSelected} disabled={!item.isAvailable} />
        ) : (
          <Radio checked={isSelected} disabled={!item.isAvailable} />
        )}
      </div>

      {/* Image */}
      {showImages && (
        image ? (
          <Image
            src={image}
            alt={title}
            className={styles.itemImage}
            preview={false}
            fallback="/placeholder.png"
          />
        ) : (
          <div className={styles.itemImagePlaceholder}>
            <ShoppingOutlined />
          </div>
        )
      )}

      {/* Content */}
      <div className={styles.itemContent}>
        <div className={styles.itemTitle}>{title}</div>
        <div className={styles.itemMeta}>
          {showSku && sku && <span>{sku}</span>}
          {showStock && item.totalStock !== undefined && (
            <Tag color={item.totalStock > 0 ? "green" : "red"} style={{ margin: 0 }}>
              {item.totalStock > 0 ? `${item.totalStock} in stock` : "Out of stock"}
            </Tag>
          )}
          {!item.isAvailable && item.stockStatus && (
            <Tag color="red" style={{ margin: 0 }}>
              {item.stockStatus}
            </Tag>
          )}
        </div>

        {/* Variant selector */}
        {hasVariants && isSelected && availableVariants.length > 0 && (
          <Select
            className={styles.variantSelect}
            placeholder="Select variant"
            value={selectedVariantId}
            onChange={setSelectedVariantId}
            onClick={(e) => e.stopPropagation()}
            options={availableVariants.map((v) => ({
              value: v.id,
              label: `${v.title} - ${formatPrice(v.price)}`,
              disabled: v.stock === 0,
            }))}
            size="small"
          />
        )}
      </div>

      {/* Pricing */}
      <div className={styles.itemPricing}>
        {comparePrice && (
          <div className={styles.itemComparePrice}>{comparePrice}</div>
        )}
        <div
          className={cx(
            styles.itemPrice,
            isFree && styles.itemPriceFree,
            isIncluded && styles.itemPriceIncluded
          )}
        >
          {isFree ? "Free" : isIncluded ? "Included" : `+${price}`}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Storefront Group Component
// ============================================================================

interface IStorefrontGroupProps {
  group: IComponentGroup;
  selectedItemIds: string[];
  onSelectionChange: (itemIds: string[]) => void;
  showImages: boolean;
  showSku: boolean;
  showStock: boolean;
  showComparePrice: boolean;
}

const StorefrontGroup = ({
  group,
  selectedItemIds,
  onSelectionChange,
  showImages,
  showSku,
  showStock,
  showComparePrice,
}: IStorefrontGroupProps) => {
  const { styles } = useStyles();

  const handleItemSelect = useCallback(
    (itemId: string) => {
      if (group.isMultiple) {
        // Multiple selection
        if (selectedItemIds.includes(itemId)) {
          // Deselect
          const newSelection = selectedItemIds.filter((id) => id !== itemId);
          if (group.isRequired && newSelection.length < group.minSelection) {
            return; // Can't go below minimum
          }
          onSelectionChange(newSelection);
        } else {
          // Select
          if (group.maxSelection && selectedItemIds.length >= group.maxSelection) {
            return; // Can't exceed maximum
          }
          onSelectionChange([...selectedItemIds, itemId]);
        }
      } else {
        // Single selection
        if (selectedItemIds.includes(itemId)) {
          // Deselect only if not required
          if (!group.isRequired) {
            onSelectionChange([]);
          }
        } else {
          onSelectionChange([itemId]);
        }
      }
    },
    [group, selectedItemIds, onSelectionChange]
  );

  const icon = GROUP_ICONS[group.slug] ?? <ShoppingOutlined />;

  const selectionText = useMemo(() => {
    const parts: string[] = [];
    if (group.isRequired) {
      parts.push("Required");
    }
    if (group.isMultiple) {
      if (group.minSelection > 0 && group.maxSelection) {
        parts.push(`Select ${group.minSelection}-${group.maxSelection}`);
      } else if (group.minSelection > 0) {
        parts.push(`Select at least ${group.minSelection}`);
      } else if (group.maxSelection) {
        parts.push(`Select up to ${group.maxSelection}`);
      } else {
        parts.push("Select multiple");
      }
    } else {
      parts.push("Select one");
    }
    return parts.join(" • ");
  }, [group]);

  return (
    <div className={styles.groupSection}>
      <div className={styles.groupHeader}>
        <span className={styles.groupIcon}>{icon}</span>
        <Typography.Text className={styles.groupTitle}>{group.title}</Typography.Text>
        {group.isRequired && (
          <Tag color="red" className={styles.requiredBadge}>
            Required
          </Tag>
        )}
      </div>

      <div className={styles.groupDescription}>{selectionText}</div>

      {group.items.length > 0 ? (
        <div className={styles.itemsList}>
          {group.items.map((item) => (
            <StorefrontItem
              key={item.id}
              item={item}
              isSelected={selectedItemIds.includes(item.id)}
              isMultiple={group.isMultiple}
              onSelect={() => handleItemSelect(item.id)}
              showImages={showImages}
              showSku={showSku}
              showStock={showStock}
              showComparePrice={showComparePrice}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyGroup}>No items in this group</div>
      )}
    </div>
  );
};

// ============================================================================
// Price Summary Component
// ============================================================================

interface IPriceSummaryProps {
  groups: IComponentGroup[];
  selectedItems: ISelectedItems;
}

const PriceSummary = ({ groups, selectedItems }: IPriceSummaryProps) => {
  const { styles, cx } = useStyles();

  const summary = useMemo(() => {
    let subtotal = 0;
    let savings = 0;
    const lines: { label: string; amount: number }[] = [];

    groups.forEach((group) => {
      const selectedIds = selectedItems[group.id] ?? [];
      selectedIds.forEach((itemId) => {
        const item = group.items.find((i) => i.id === itemId);
        if (!item) return;

        const title = getItemTitle(item);
        subtotal += item.finalPrice;

        if (item.basePrice > item.finalPrice) {
          savings += item.basePrice - item.finalPrice;
        }

        if (item.finalPrice > 0) {
          lines.push({ label: title, amount: item.finalPrice });
        } else if (item.priceType === ComponentPriceType.FREE) {
          lines.push({ label: `${title} (Free)`, amount: 0 });
        }
      });
    });

    return { subtotal, savings, lines };
  }, [groups, selectedItems]);

  if (summary.lines.length === 0) {
    return null;
  }

  return (
    <div className={styles.summarySection}>
      <Typography.Text strong style={{ marginBottom: 8, display: "block" }}>
        Order Summary
      </Typography.Text>

      {summary.lines.map((line, idx) => (
        <div key={idx} className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{line.label}</span>
          <span className={styles.summaryValue}>
            {line.amount > 0 ? `+${formatPrice(line.amount)}` : "Free"}
          </span>
        </div>
      ))}

      {summary.savings > 0 && (
        <div className={styles.summaryRow}>
          <span className={cx(styles.summaryLabel, styles.summaryDiscount)}>
            Your savings
          </span>
          <span className={cx(styles.summaryValue, styles.summaryDiscount)}>
            -{formatPrice(summary.savings)}
          </span>
        </div>
      )}

      <div className={cx(styles.summaryRow, styles.summaryRowTotal)}>
        <span>Components Total</span>
        <span className={styles.summaryValue}>{formatPrice(summary.subtotal)}</span>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PreviewTab = ({
  groups,
  displayStyle,
  showImages,
  showSku,
  showStock,
  showComparePrice,
}: IPreviewTabProps) => {
  const { styles } = useStyles();

  // Initialize selected items with defaults
  const [selectedItems, setSelectedItems] = useState<ISelectedItems>(() => {
    const initial: ISelectedItems = {};
    groups.forEach((group) => {
      initial[group.id] = group.defaultItemIds.filter((id) =>
        group.items.some((item) => item.id === id)
      );
    });
    return initial;
  });

  const handleSelectionChange = useCallback((groupId: string, itemIds: string[]) => {
    setSelectedItems((prev) => ({
      ...prev,
      [groupId]: itemIds,
    }));
  }, []);

  return (
    <div className={styles.container}>
      {/* Preview Container */}
      <div className={styles.previewWrapper}>
        <div className={styles.previewContainer}>
          {/* Storefront Header */}
          <div className={styles.storefrontHeader}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Configure Your Bundle
            </Typography.Title>
            <Typography.Text type="secondary">
              Select the components you want to include
            </Typography.Text>
          </div>

          {/* Storefront Content */}
          <div className={styles.storefrontContent}>
            {groups.map((group) => (
              <StorefrontGroup
                key={group.id}
                group={group}
                selectedItemIds={selectedItems[group.id] ?? []}
                onSelectionChange={(ids) => handleSelectionChange(group.id, ids)}
                showImages={showImages}
                showSku={showSku}
                showStock={showStock}
                showComparePrice={showComparePrice}
              />
            ))}

            {/* Price Summary */}
            <PriceSummary groups={groups} selectedItems={selectedItems} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewTab;
