"use client";

import { Typography, Empty } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type {
  PricingRuleTemplate,
} from "@/domains/inventory/products/modals/edit-components-modal/types";
import {
  ComponentPriceType,
  PRICE_RULE_OPTIONS,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  pills: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
  },
  pill: {
    flex: "0 1 auto",
    minWidth: 140,
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    position: "relative" as const,
    overflow: "hidden",
  },
  pillStripe: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: "4px 0 0 4px",
  },
  pillName: {
    fontSize: 13,
    fontWeight: 600,
    paddingLeft: 8,
  },
  pillType: {
    fontSize: 11,
    color: token.colorTextTertiary,
    paddingLeft: 8,
  },
  pillValue: {
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "monospace",
    paddingLeft: 8,
    marginTop: 4,
  },
}));

// ============================================================================
// Color Map
// ============================================================================

const STRIPE_COLORS: Partial<Record<ComponentPriceType, string>> = {
  [ComponentPriceType.MARKUP_PERCENT]: "#1677ff",
  [ComponentPriceType.MARKUP_FIXED]: "#1677ff",
  [ComponentPriceType.DISCOUNT_PERCENT]: "#fa8c16",
  [ComponentPriceType.DISCOUNT_FIXED]: "#fa8c16",
  [ComponentPriceType.FIXED]: "#722ed1",
  [ComponentPriceType.FREE]: "#52c41a",
  [ComponentPriceType.INCLUDED]: "#13c2c2",
  [ComponentPriceType.BASE]: "#d9d9d9",
};

// ============================================================================
// Helpers
// ============================================================================

const formatValue = (tpl: PricingRuleTemplate): string => {
  const opt = PRICE_RULE_OPTIONS.find((o) => o.value === tpl.priceType);
  if (!opt) return "—";
  if (tpl.priceValue == null) return "—";

  const isDiscount = tpl.priceType === ComponentPriceType.DISCOUNT_PERCENT
    || tpl.priceType === ComponentPriceType.DISCOUNT_FIXED;
  const isMarkup = tpl.priceType === ComponentPriceType.MARKUP_PERCENT
    || tpl.priceType === ComponentPriceType.MARKUP_FIXED;

  const prefix = isDiscount ? "-" : isMarkup ? "+" : "";
  return `${prefix}${tpl.priceValue}${opt.valueSuffix ?? ""}`;
};

// ============================================================================
// Props
// ============================================================================

interface ITemplatesSectionProps {
  pricingTemplates: PricingRuleTemplate[];
  onEdit: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const TemplatesSection = ({
  pricingTemplates,
  onEdit,
}: ITemplatesSectionProps) => {
  const { styles } = useStyles();

  return (
    <Paper>
      <PaperHeader
        title="Pricing Templates"
        actions={<EditAction onEdit={onEdit} label="Edit templates" />}
      />
      {pricingTemplates.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No pricing templates configured"
        />
      ) : (
        <div className={styles.pills}>
          {pricingTemplates.map((tpl) => {
            const option = PRICE_RULE_OPTIONS.find((o) => o.value === tpl.priceType);
            const stripeColor = STRIPE_COLORS[tpl.priceType] ?? "#d9d9d9";

            return (
              <div key={tpl.id} className={styles.pill}>
                <div
                  className={styles.pillStripe}
                  style={{ background: stripeColor }}
                />
                <Typography.Text className={styles.pillName}>
                  {tpl.name}
                </Typography.Text>
                <span className={styles.pillType}>
                  {option?.label ?? tpl.priceType}
                </span>
                <Typography.Text className={styles.pillValue}>
                  {formatValue(tpl)}
                </Typography.Text>
              </div>
            );
          })}
        </div>
      )}
    </Paper>
  );
};
