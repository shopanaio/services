"use client";

import { Typography, Flex, Avatar, Tag } from "antd";
import {
  PictureOutlined,
  CheckSquareOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
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
  laneRequired: {
    borderLeftWidth: 3,
    borderLeftColor: token.colorSuccess,
  },
  laneHeader: {
    padding: "10px 12px 8px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  laneTitle: {
    fontSize: 13,
    fontWeight: 600,
  },
  laneMeta: {
    fontSize: 11,
    color: token.colorTextTertiary,
    marginTop: 2,
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
  itemName: {
    flex: 1,
    fontSize: 12,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemIcon: {
    fontSize: 12,
    color: token.colorTextQuaternary,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    "&&": {
      background: token.colorFillSecondary,
      color: token.colorTextQuaternary,
      fontSize: 10,
    },
  },
  priceTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
      margin: 0,
      borderRadius: 3,
      flexShrink: 0,
    },
  },
  laneFooter: {
    padding: "6px 12px",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    fontSize: 11,
    color: token.colorTextTertiary,
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IGroupsSectionProps {
  groups: IBundleGroup[];
  onEdit: () => void;
}

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

const isTemplate = (rule: BundleItem["pricingRule"]): rule is PricingRuleTemplate => {
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
  onEdit,
}: IGroupsSectionProps) => {
  const { styles, cx } = useStyles();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Bundle Items"
        actions={<EditAction onEdit={onEdit} label="Edit bundle items" />}
      />
      <div className={styles.lanes}>
        {groups.map((group) => (
          <div
            key={group.id}
            className={cx(styles.lane, group.isRequired && styles.laneRequired)}
          >
            <div className={styles.laneHeader}>
              <Flex justify="space-between" align="center">
                <Typography.Text className={styles.laneTitle}>
                  {group.title}
                </Typography.Text>
              </Flex>
              <div className={styles.laneMeta}>
                {[
                  group.isRequired ? "REQUIRED" : "OPTIONAL",
                  group.isMultiple ? "MULTIPLE" : "SINGLE",
                ]
                  .join(" · ")}
              </div>
              <div className={styles.laneMeta}>
                {getSelectionLabel(group)}
              </div>
            </div>
            <div className={styles.laneBody}>
              {group.items?.map((item) => {
                const imgUrl = getItemImageUrl(item);
                const priceLabel = item.pricingRule
                  ? getPriceRuleLabel(item.pricingRule)
                  : null;
                return (
                  <div key={item.id} className={styles.itemRow}>
                    <Avatar
                      size={22}
                      shape="square"
                      src={imgUrl}
                      icon={!imgUrl ? <PictureOutlined /> : undefined}
                      className={!imgUrl ? styles.avatarPlaceholder : undefined}
                    />
                    <span className={styles.itemName}>{getItemName(item)}</span>
                    {priceLabel && (
                      <Tag
                        color={getPriceRuleColor(item.pricingRule!.priceType)}
                        className={styles.priceTag}
                      >
                        {priceLabel}
                      </Tag>
                    )}
                    {group.isMultiple ? (
                      <CheckSquareOutlined className={styles.itemIcon} />
                    ) : (
                      <CheckCircleOutlined className={styles.itemIcon} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className={styles.laneFooter}>
              {group.items?.length || 0} items
            </div>
          </div>
        ))}
      </div>
    </Paper>
  );
};
