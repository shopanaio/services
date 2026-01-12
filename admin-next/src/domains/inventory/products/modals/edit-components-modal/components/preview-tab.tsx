"use client";

import { useState, useMemo, useCallback } from "react";
import { createStyles } from "antd-style";
import { Typography, Radio, Checkbox, Tag, Image } from "antd";
import { ShoppingOutlined } from "@ant-design/icons";

import type { DisplayStyle, IComponentGroup, ComponentItem } from "../types";
import { ComponentItemType, ComponentPriceType } from "../types";

// Format price helper
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

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
      backgroundColor: token.colorPrimaryBgHover,
    },
  },
  itemCardSelected: {
    borderColor: token.colorPrimary,
    backgroundColor: token.colorPrimaryBg,
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
// Helper Types
// ============================================================================

// Helper to check if pricingRule is a template
const isTemplate = (rule: ComponentItem["pricingRule"]): boolean => {
  return "id" in rule && "name" in rule;
};

const getPriceType = (item: ComponentItem): ComponentPriceType => {
  return isTemplate(item.pricingRule)
    ? item.pricingRule.priceType
    : item.pricingRule.priceType;
};

// ============================================================================
// Helper Functions
// ============================================================================

const getItemTitle = (item: ComponentItem): string => {
  if (item.title) return item.title;

  if (item.itemType === ComponentItemType.VARIANT && item.assignedVariant) {
    return item.assignedVariant.title ?? "Unknown Variant";
  }

  return item.assignedProduct?.title ?? "Unknown Product";
};

const getItemImage = (item: ComponentItem): string | null => {
  if (item.featuredImage?.url) return item.featuredImage.url;

  if (item.itemType === ComponentItemType.VARIANT && item.assignedVariant) {
    const variantMedia = item.assignedVariant.media?.[0]?.file?.url;
    if (variantMedia) return variantMedia;
    // ApiProduct doesn't have media directly
    return null;
  }

  // ApiProduct doesn't have media directly
  return null;
};

const getItemSku = (item: ComponentItem): string => {
  if (item.itemType === ComponentItemType.VARIANT && item.assignedVariant) {
    return item.assignedVariant.sku ?? "";
  }
  // ApiProduct doesn't have sku directly
  return "";
};

const getItemBasePrice = (item: ComponentItem): number => {
  if (item.itemType === ComponentItemType.VARIANT && item.assignedVariant) {
    // ApiVariant.price is ApiVariantPrice object with amountMinor in cents
    const amountMinor = item.assignedVariant.price?.amountMinor;
    return typeof amountMinor === "bigint"
      ? Number(amountMinor) / 100
      : typeof amountMinor === "number"
      ? amountMinor / 100
      : 0;
  }
  // ApiProduct doesn't have price directly
  return 0;
};

const formatPriceDisplay = (
  item: ComponentItem,
  showComparePrice: boolean
): {
  price: string;
  comparePrice?: string;
  isFree: boolean;
  isIncluded: boolean;
} => {
  const priceType = getPriceType(item);
  const isFree = priceType === ComponentPriceType.FREE;
  const isIncluded = priceType === ComponentPriceType.INCLUDED;

  if (isFree) {
    return { price: "Free", isFree: true, isIncluded: false };
  }

  if (isIncluded) {
    return { price: "Included", isFree: false, isIncluded: true };
  }

  // Calculate final price based on pricing rule
  const basePrice = getItemBasePrice(item);
  const priceValue = isTemplate(item.pricingRule)
    ? item.pricingRule.priceValue
    : item.pricingRule.priceValue;

  let finalPrice = basePrice;
  switch (priceType) {
    case ComponentPriceType.FIXED:
      finalPrice = priceValue ?? 0;
      break;
    case ComponentPriceType.MARKUP_PERCENT:
      finalPrice = basePrice * (1 + (priceValue ?? 0) / 100);
      break;
    case ComponentPriceType.DISCOUNT_PERCENT:
      finalPrice = basePrice * (1 - (priceValue ?? 0) / 100);
      break;
    case ComponentPriceType.MARKUP_FIXED:
      finalPrice = basePrice + (priceValue ?? 0);
      break;
    case ComponentPriceType.DISCOUNT_FIXED:
      finalPrice = basePrice - (priceValue ?? 0);
      break;
    default:
      finalPrice = basePrice;
  }

  const price = formatPrice(finalPrice);
  let comparePrice: string | undefined;
  if (showComparePrice && basePrice !== finalPrice) {
    comparePrice = formatPrice(basePrice);
  }

  return { price, comparePrice, isFree: false, isIncluded: false };
};

// ============================================================================
// Storefront Item Component
// ============================================================================

interface IStorefrontItemProps {
  item: ComponentItem;
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

  const title = getItemTitle(item);
  const image = getItemImage(item);
  const sku = getItemSku(item);
  const { price, comparePrice, isFree, isIncluded } = formatPriceDisplay(
    item,
    showComparePrice
  );

  // For now, items are always available (stock logic removed)
  const isAvailable = true;

  const handleClick = useCallback(() => {
    if (!isAvailable) return;
    onSelect();
  }, [isAvailable, onSelect]);

  return (
    <div
      className={cx(
        styles.itemCard,
        isSelected && styles.itemCardSelected,
        !isAvailable && styles.itemCardDisabled
      )}
      onClick={handleClick}
    >
      {/* Selection indicator */}
      <div
        className={isMultiple ? styles.checkboxWrapper : styles.radioWrapper}
      >
        {isMultiple ? (
          <Checkbox checked={isSelected} disabled={!isAvailable} />
        ) : (
          <Radio checked={isSelected} disabled={!isAvailable} />
        )}
      </div>

      {/* Image */}
      {showImages &&
        (image ? (
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
        ))}

      {/* Content */}
      <div className={styles.itemContent}>
        <div className={styles.itemTitle}>{title}</div>
        <div className={styles.itemMeta}>
          {showSku && sku && <span>{sku}</span>}
          {showStock && item.itemType === ComponentItemType.VARIANT && (
            <Tag color="green" style={{ margin: 0 }}>
              In stock
            </Tag>
          )}
        </div>
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
          const minSelection = group.minSelection ?? 0;
          if (group.isRequired && newSelection.length < minSelection) {
            return; // Can't go below minimum
          }
          onSelectionChange(newSelection);
        } else {
          // Select
          if (
            group.maxSelection &&
            selectedItemIds.length >= group.maxSelection
          ) {
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

  const icon = <ShoppingOutlined />;

  const selectionText = useMemo(() => {
    const parts: string[] = [];
    if (group.isRequired) {
      parts.push("Required");
    }
    if (group.isMultiple) {
      const minSelection = group.minSelection ?? 0;
      if (minSelection > 0 && group.maxSelection) {
        parts.push(`Select ${minSelection}-${group.maxSelection}`);
      } else if (minSelection > 0) {
        parts.push(`Select at least ${minSelection}`);
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
        <Typography.Text className={styles.groupTitle}>
          {group.title}
        </Typography.Text>
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
        const basePrice = getItemBasePrice(item);
        const priceType = getPriceType(item);

        // Calculate final price
        const priceValue = isTemplate(item.pricingRule)
          ? item.pricingRule.priceValue
          : item.pricingRule.priceValue;

        let finalPrice = basePrice;
        switch (priceType) {
          case ComponentPriceType.FIXED:
            finalPrice = priceValue ?? 0;
            break;
          case ComponentPriceType.MARKUP_PERCENT:
            finalPrice = basePrice * (1 + (priceValue ?? 0) / 100);
            break;
          case ComponentPriceType.DISCOUNT_PERCENT:
            finalPrice = basePrice * (1 - (priceValue ?? 0) / 100);
            break;
          case ComponentPriceType.MARKUP_FIXED:
            finalPrice = basePrice + (priceValue ?? 0);
            break;
          case ComponentPriceType.DISCOUNT_FIXED:
            finalPrice = basePrice - (priceValue ?? 0);
            break;
          case ComponentPriceType.FREE:
          case ComponentPriceType.INCLUDED:
            finalPrice = 0;
            break;
          default:
            finalPrice = basePrice;
        }

        subtotal += finalPrice;

        if (basePrice > finalPrice) {
          savings += basePrice - finalPrice;
        }

        if (finalPrice > 0) {
          lines.push({ label: title, amount: finalPrice });
        } else if (priceType === ComponentPriceType.FREE) {
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
        <span className={styles.summaryValue}>
          {formatPrice(summary.subtotal)}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const PreviewTab = ({
  groups,
  showImages,
  showSku,
  showStock,
  showComparePrice,
}: IPreviewTabProps) => {
  const { styles } = useStyles();

  // Initialize selected items (no defaults in new structure)
  const [selectedItems, setSelectedItems] = useState<ISelectedItems>(() => {
    const initial: ISelectedItems = {};
    groups.forEach((group) => {
      initial[group.id] = [];
    });
    return initial;
  });

  const handleSelectionChange = useCallback(
    (groupId: string, itemIds: string[]) => {
      setSelectedItems((prev) => ({
        ...prev,
        [groupId]: itemIds,
      }));
    },
    []
  );

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
                onSelectionChange={(ids) =>
                  handleSelectionChange(group.id, ids)
                }
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
