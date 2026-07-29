"use client";

import { useMemo, useState } from "react";
import { Button, Flex, Typography } from "antd";
import {
  LuActivity,
  LuCircleDollarSign,
  LuGift,
  LuPercent,
  LuTruck,
} from "react-icons/lu";
import type { ApiDiscount, CurrencyCode } from "@/graphql/types";
import {
  DiscountEffectiveStatus,
  DiscountRequirementType,
  DiscountValueType,
} from "@/graphql/types";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { PriceHistoryChartColumn } from "@/domains/inventory/products/components/pricing/components/price-history-chart-column";
import type { PriceChartPoint } from "@/domains/inventory/products/components/pricing/components/price-chart";
import { useStyles as usePricingWidgetStyles } from "@/domains/inventory/products/components/pricing/pricing-block.styles";
import {
  DEFAULT_CHART_PERIOD,
  getPeriodDays,
  type ChartPeriod,
} from "@/domains/inventory/products/utils/periods";
import { DiscountSectionIcon } from "../discount-section-icon";
import { useDiscountSectionStyles } from "../discount-details-card.styles";
import {
  formatDiscountCount,
  formatDiscountEnum,
  formatDiscountMoney,
  formatDiscountPercentage,
} from "../formatters";

interface ValueUsageSectionProps {
  discount: ApiDiscount;
  currency: CurrencyCode | null;
  onViewActivity?: () => void;
}

function formatRuleValue(
  discount: ApiDiscount,
  currency: CurrencyCode | null,
): string {
  const { rule } = discount;
  if (!rule) return "Not configured";

  if (rule.__typename === "DiscountAmountOffRule") {
    if (rule.valueType === DiscountValueType.Percentage) {
      return formatDiscountPercentage(rule.percentageBps);
    }
    if (rule.valueType === DiscountValueType.FixedAmount) {
      return formatDiscountMoney(rule.amountMinor, currency);
    }
    return "Free";
  }

  if (rule.__typename === "DiscountBuyXGetYRule") {
    return `Buy ${formatDiscountCount(rule.requiredQuantity)}`;
  }

  return "Free";
}

function getValuePresentation(discount: ApiDiscount) {
  const rule = discount.rule;

  if (rule?.__typename === "DiscountBuyXGetYRule") {
    return { icon: <LuGift />, label: "Buy X Get Y" };
  }

  if (rule?.__typename === "DiscountFreeShippingRule") {
    return { icon: <LuTruck />, label: "Shipping discount" };
  }

  if (
    rule?.__typename === "DiscountAmountOffRule" &&
    rule.valueType === DiscountValueType.Percentage
  ) {
    return { icon: <LuPercent />, label: "Percentage off" };
  }

  return { icon: <LuCircleDollarSign />, label: "Fixed amount off" };
}

interface ValueDetail {
  label: string;
  value: string;
}

function getValueDetails(
  discount: ApiDiscount,
  currency: CurrencyCode | null,
): ValueDetail[] {
  const details: ValueDetail[] = [];
  const minimum = discount.minimumRequirement;
  const rule = discount.rule;

  if (rule?.__typename === "DiscountAmountOffRule") {
    details.push({
      label: "Allocation",
      value:
        discount.discountClass === "ORDER"
          ? `${formatDiscountEnum(rule.allocationMethod)} the order`
          : formatDiscountEnum(rule.allocationMethod),
    });
  } else if (rule?.__typename === "DiscountBuyXGetYRule") {
    if (rule.requirementType === DiscountRequirementType.Quantity) {
      details.push({
        label: "Qualifier",
        value: `${formatDiscountCount(rule.requiredQuantity)} eligible items`,
      });
    } else {
      details.push({
        label: "Qualifier",
        value: `Subtotal ${formatDiscountMoney(rule.requiredSubtotalMinor, currency)}`,
      });
    }
    const benefit =
      rule.benefitValueType === DiscountValueType.Percentage
        ? formatDiscountPercentage(rule.benefitPercentageBps)
        : rule.benefitValueType === DiscountValueType.FixedAmount
          ? formatDiscountMoney(rule.benefitAmountMinor, currency)
          : "Free";
    details.push({
      label: "Benefit",
      value: `${formatDiscountCount(rule.benefitQuantity)} item${rule.benefitQuantity === 1 ? "" : "s"} · ${benefit}`,
    });
    details.push({
      label: "Uses per order",
      value:
        rule.usesPerOrderLimit == null
          ? "No limit"
          : `Up to ${formatDiscountCount(rule.usesPerOrderLimit)} times`,
    });
    return details;
  } else if (rule?.__typename === "DiscountFreeShippingRule") {
    details.push({
      label: "Maximum shipping price",
      value:
        rule.maximumShippingPriceMinor == null
          ? "No limit"
          : formatDiscountMoney(rule.maximumShippingPriceMinor, currency),
    });
  }

  if (minimum?.requirementType === DiscountRequirementType.Subtotal) {
    details.push({
      label: "Minimum purchase",
      value: `Subtotal ${formatDiscountMoney(minimum.subtotalMinor, currency)}`,
    });
  } else if (minimum?.requirementType === DiscountRequirementType.Quantity) {
    details.push({
      label: "Minimum purchase",
      value: `${formatDiscountCount(minimum.quantity)} items`,
    });
  } else {
    details.push({
      label: "Minimum purchase",
      value: "None",
    });
  }

  if (rule?.__typename === "DiscountAmountOffRule") {
    details.push({
      label: "Maximum discount",
      value:
        rule.maximumDiscountMinor == null
          ? "No limit"
          : formatDiscountMoney(rule.maximumDiscountMinor, currency),
    });
  }

  if (rule?.__typename === "DiscountFreeShippingRule" && currency) {
    details.push({
      label: "Currency",
      value: currency,
    });
  }

  return details;
}

function buildUsagePoints(
  discount: ApiDiscount,
  period: ChartPeriod,
): PriceChartPoint[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const days = getPeriodDays(period);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const values = Array.from({ length: days }, () => 0);

  if (discount.effectiveStatus !== DiscountEffectiveStatus.Scheduled) {
    for (const edge of discount.redemptions.edges) {
      const committedAt = new Date(edge.node.committedAt).getTime();
      const age = Math.floor((end.getTime() - committedAt) / dayMs);
      if (age >= 0 && age < values.length) {
        values[values.length - age - 1] += 1;
      }
    }
  }

  return values.map((value, index) => ({
    date: new Date(end.getTime() - (values.length - index - 1) * dayMs),
    value,
    isCurrent: index === values.length - 1,
  }));
}

export function ValueUsageSection({
  discount,
  currency,
  onViewActivity,
}: ValueUsageSectionProps) {
  const { styles } = useDiscountSectionStyles();
  const { styles: pricingStyles } = usePricingWidgetStyles();
  const [period, setPeriod] = useState<ChartPeriod>(DEFAULT_CHART_PERIOD);
  const valueDetails = getValueDetails(discount, currency);
  const valuePresentation = getValuePresentation(discount);
  const usagePoints = useMemo(
    () => buildUsagePoints(discount, period),
    [discount, period],
  );

  if (!discount.rule) {
    return (
      <Paper className={styles.section} data-testid="discount-value-usage-section">
        <PaperHeader title="Value & usage" className={styles.compactHeader} />
        <EntityDetailsEmptyState
          icon={<LuPercent />}
          state={{
            title: "Discount value not configured",
            description:
              "Add a discount value and usage policy to calculate the benefit.",
          }}
        />
      </Paper>
    );
  }

  return (
    <Paper
      className={`${styles.section} ${pricingStyles.card}`}
      data-testid="discount-value-usage-section"
    >
      <PaperHeader
        title="Value & usage"
        actions={
          onViewActivity ? (
            <Button
              size="small"
              icon={<LuActivity />}
              onClick={onViewActivity}
            >
              View activity
            </Button>
          ) : undefined
        }
      />

      <div className={pricingStyles.twoColumn}>
        <div className={pricingStyles.priceColumnWrapper}>
          <div className={pricingStyles.column}>
            <Flex align="center" gap={8}>
              <DiscountSectionIcon
                icon={valuePresentation.icon}
                size={28}
              />
              <Typography.Text
                className={styles.valueTypeLabel}
              >
                {valuePresentation.label}
              </Typography.Text>
            </Flex>
            <Typography.Title
              level={2}
              className={`${pricingStyles.mainPrice} ${styles.discountMainValue}`}
            >
              {formatRuleValue(discount, currency)}
            </Typography.Title>

            <div className={styles.detailList}>
              {valueDetails.map((detail) => (
                <div className={styles.valueDetailRow} key={detail.label}>
                  <Typography.Text
                    type="secondary"
                    className={styles.valueDetailLabel}
                  >
                    {detail.label}
                  </Typography.Text>
                  <Typography.Text
                    strong
                    className={styles.valueDetailValue}
                  >
                    {detail.value}
                  </Typography.Text>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={pricingStyles.chartColumnWrapper}>
          <PriceHistoryChartColumn
            points={usagePoints}
            period={period}
            onPeriodChange={(value) => setPeriod(value as ChartPeriod)}
            label="Usage history"
            valueFormatter={(value) => formatDiscountCount(value)}
          />
        </div>
      </div>

      <div className={pricingStyles.kpiRow}>
        <KPITile
          label="Usage limit"
          value={
            discount.usage.usageLimit == null
              ? "Unlimited"
              : formatDiscountCount(discount.usage.usageLimit)
          }
          tooltip={
            discount.method === "AUTOMATIC"
              ? "Automatic discount usage limit"
              : "Aggregate discount usage cap"
          }
          centered
          className={pricingStyles.kpiTile}
        />
        <KPITile
          label="Consumed"
          value={formatDiscountCount(discount.usage.consumedCount)}
          tooltip={`${formatDiscountCount(discount.usage.committedCount)} committed · ${formatDiscountCount(discount.usage.reservedCount)} reserved`}
          centered
          className={pricingStyles.kpiTile}
        />
        <KPITile
          label="Reversed"
          value={formatDiscountCount(discount.usage.reversedCount)}
          tooltip="Reversed redemptions"
          centered
          className={pricingStyles.kpiTile}
        />
        <KPITile
          label="Remaining"
          value={
            discount.usage.remainingCount == null
              ? "∞"
              : formatDiscountCount(discount.usage.remainingCount)
          }
          tooltip={
            discount.usage.usageLimit == null
              ? "No aggregate usage cap"
              : "Available discount uses"
          }
          centered
          className={pricingStyles.kpiTile}
        />
      </div>
    </Paper>
  );
}
