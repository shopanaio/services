"use client";

import { Typography, Avatar, Tag, Badge } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type {
  IBundleGroup,
  BundleItem,
  PricingRuleTemplate,
} from "@/domains/promos/bundles/types";
import {
  BundleItemType,
  BundlePriceType,
  PRICE_RULE_OPTIONS,
} from "@/domains/promos/bundles/types";
import type { BundleType } from "@/mocks/products/bundles-list";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  lanes: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  lane: {
    display: "flex",
    flexDirection: "column" as const,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    overflow: "hidden",
  },
  laneHeader: {
    padding: "10px 12px 8px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  laneTitle: {
    fontSize: token.fontSize,
    fontWeight: 600,
  },
  badgeIndicator: {
    outline: `2px solid ${token.colorPrimary}`,
    fontSize: token.fontSizeSM,
  },
  laneTags: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 4,
    marginTop: 6,
  },
  laneTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
      margin: 0,
      borderRadius: 3,
    },
  },
  laneBody: {
    flex: 1,
    padding: "6px 8px",
    maxHeight: 200,
    overflowY: "auto" as const,
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 4px",
    borderRadius: 4,
    "&:hover": {
      background: token.colorFillQuaternary,
    },
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "block",
  },
  itemQty: {
    fontSize: 10,
    display: "block",
    marginTop: -4,
  },
  avatarPlaceholder: {
    "&&": {
      background: token.colorFillSecondary,
      color: token.colorTextQuaternary,
      fontSize: 10,
    },
  },
  itemTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
      margin: 0,
      borderRadius: 3,
      flexShrink: 0,
    },
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IGroupsSectionProps {
  groups: IBundleGroup[];
  bundleType?: BundleType | null;
  onEdit: () => void;
}

const BUNDLE_TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  FIXED: { color: "blue", label: "Fixed Kit" },
  MULTIPACK: { color: "cyan", label: "Multipack" },
  MIX_AND_MATCH: { color: "purple", label: "Mix & Match" },
};

// ============================================================================
// Helpers
// ============================================================================

const getItemImageUrl = (item: BundleItem): string | null => {
  if (item.featuredImage?.url) {
    return item.featuredImage.url;
  }
  if (item.itemType === BundleItemType.VARIANT && item.assignedVariant) {
    return item.assignedVariant.media?.[0]?.file?.url ?? null;
  }
  return null;
};

const getItemName = (item: BundleItem): string => {
  if (item.title) return item.title;
  if (item.itemType === BundleItemType.VARIANT && item.assignedVariant) {
    return item.assignedVariant.title ?? "Variant";
  }
  if (item.assignedProduct) {
    return item.assignedProduct.title ?? "Product";
  }
  return "Item";
};

const isTemplate = (
  rule: BundleItem["pricingRule"],
): rule is PricingRuleTemplate => {
  return "id" in rule && "name" in rule;
};

const getPriceRuleLabel = (rule: BundleItem["pricingRule"]): string | null => {
  if (!rule) return null;
  const { priceType, priceValue } = rule;
  if (priceType === BundlePriceType.BASE) return null;

  if (isTemplate(rule) && rule.name) return rule.name;

  const option = PRICE_RULE_OPTIONS.find((o) => o.value === priceType);
  if (!option) return null;

  if (option.requiresValue && priceValue != null) {
    return option.valueSuffix === "%"
      ? `${option.label} ${priceValue}%`
      : `${option.label} $${priceValue}`;
  }
  return option.label;
};

const getPriceRuleColor = (priceType: BundlePriceType): string => {
  switch (priceType) {
    case BundlePriceType.DISCOUNT_PERCENT:
    case BundlePriceType.DISCOUNT_FIXED:
    case BundlePriceType.FREE:
      return "green";
    case BundlePriceType.MARKUP_PERCENT:
    case BundlePriceType.MARKUP_FIXED:
      return "orange";
    case BundlePriceType.FIXED:
      return "blue";
    case BundlePriceType.INCLUDED:
      return "purple";
    default:
      return "default";
  }
};

const getItemQtyLabel = (item: BundleItem): string | null => {
  const min = item.minQty;
  const max = item.maxQty;
  if (!min && !max) return null;
  if (min && max) return min === max ? `Qty: ${min}` : `Qty: ${min}–${max}`;
  if (min) return `Min: ${min}`;
  if (max) return `Max: ${max}`;
  return null;
};

const getSelectionLabel = (group: IBundleGroup): string => {
  if (!group.isMultiple) {
    return "Select 1";
  }
  const min = group.minSelection;
  const max = group.maxSelection;
  if (min && max) return `Select ${min}–${max}`;
  if (min) return `Min ${min}`;
  if (max) return `Up to ${max}`;
  return "Any amount";
};

// ============================================================================
// Component
// ============================================================================

export const GroupsSection = ({
  groups,
  bundleType,
  onEdit,
}: IGroupsSectionProps) => {
  const { styles } = useStyles();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Bundle"
        extra={
          bundleType && BUNDLE_TYPE_CONFIG[bundleType] ? (
            <Tag color={BUNDLE_TYPE_CONFIG[bundleType].color}>
              {BUNDLE_TYPE_CONFIG[bundleType].label}
            </Tag>
          ) : undefined
        }
        actions={<EditAction onEdit={onEdit} label="Edit bundle items" />}
      />
      <div className={styles.lanes}>
        {groups.map((group) => (
          <div
            key={group.id}
            className={styles.lane}
          >
            <div className={styles.laneHeader}>
              <Typography.Text className={styles.laneTitle}>
                {group.title}{" "}
                <Badge
                  offset={[2, -2]}
                  count={group.items?.length || 0}
                  size="small"
                  color="blue"
                  classNames={{ indicator: styles.badgeIndicator }}
                />
              </Typography.Text>
              <div className={styles.laneTags}>
                <Tag className={styles.laneTag}>
                  {group.isRequired ? "Required" : "Optional"}
                </Tag>
                <Tag className={styles.laneTag}>
                  {group.isMultiple ? "Multiple" : "Single"}
                </Tag>
                <Tag className={styles.laneTag}>{getSelectionLabel(group)}</Tag>
              </div>
            </div>
            <div className={styles.laneBody}>
              {group.items?.map((item) => {
                const imgUrl = getItemImageUrl(item);
                const priceLabel = item.pricingRule
                  ? getPriceRuleLabel(item.pricingRule)
                  : null;
                const qtyLabel = getItemQtyLabel(item);
                return (
                  <div key={item.id} className={styles.itemRow}>
                    <Avatar
                      size={40}
                      shape="square"
                      src={imgUrl}
                      icon={!imgUrl ? <PictureOutlined /> : undefined}
                      className={!imgUrl ? styles.avatarPlaceholder : undefined}
                    />
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>
                        {getItemName(item)}
                      </span>
                      {qtyLabel && (
                        <Typography.Text
                          type="secondary"
                          className={styles.itemQty}
                        >
                          {qtyLabel}
                        </Typography.Text>
                      )}
                    </div>
                    {priceLabel && (
                      <Tag
                        color={getPriceRuleColor(item.pricingRule!.priceType)}
                        className={styles.itemTag}
                      >
                        {priceLabel}
                      </Tag>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Paper>
  );
};
