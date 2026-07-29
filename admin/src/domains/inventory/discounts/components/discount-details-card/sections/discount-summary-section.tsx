"use client";

import {
  Button,
  Divider,
  Flex,
  Segmented,
  Switch,
  Tag,
  Typography,
} from "antd";
import { LuEllipsis } from "react-icons/lu";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { DiscountStatusTag } from "../discount-status-tag";
import { DiscountEffectiveStatus } from "@/graphql/types";
import { useDiscountSummaryStyles } from "../discount-details-card.styles";
import {
  formatDiscountCount,
  formatDiscountDate,
  formatDiscountKind,
  formatDiscountMoney,
  formatDiscountMethod,
  formatDiscountPercentage,
  getShortDiscountId,
} from "../formatters";
import type { DiscountSummarySectionProps } from "../types";

function IdentityChip({ label, value }: { label: string; value: string }) {
  const { styles } = useDiscountSummaryStyles();

  return (
    <Tag className={styles.identityChip}>
      <Typography.Text type="secondary" className={styles.chipLabel}>
        {label}
      </Typography.Text>
      <Typography.Text className={styles.chipValue}>{value}</Typography.Text>
    </Tag>
  );
}

export function DiscountSummarySection({
  discount,
  currency,
  onEdit,
}: DiscountSummarySectionProps) {
  const { styles } = useDiscountSummaryStyles();
  const title = discount.title ?? discount.primaryCode ?? "Untitled discount";
  const redemptionAmounts = discount.redemptions.edges.map(
    ({ node }) => Number(node.amountMinor),
  ).filter(
    (amount) => Number.isFinite(amount),
  );
  const averageAmount =
    redemptionAmounts.length > 0
      ? Math.round(
          redemptionAmounts.reduce((sum, value) => sum + value, 0) /
            redemptionAmounts.length,
        )
      : null;
  const discountedSales =
    averageAmount == null
      ? null
      : averageAmount * discount.redemptions.totalCount;
  const averageDiscount = (() => {
    const rule = discount.rule;
    if (!rule) return "—";
    if (rule.__typename === "DiscountAmountOffRule") {
      if (rule.percentageBps != null) {
        return formatDiscountPercentage(rule.percentageBps);
      }
      return formatDiscountMoney(rule.amountMinor, currency);
    }
    if (rule.__typename === "DiscountFreeShippingRule") {
      return averageAmount == null
        ? "—"
        : formatDiscountMoney(averageAmount, currency);
    }
    return "—";
  })();
  const statusTitle = (
    <Flex align="center" gap={8} wrap>
      <DiscountStatusTag
        status={discount.effectiveStatus}
        className={styles.statusTag}
      />
      <Typography.Text type="secondary" className={styles.metaText}>
        {discount.effectiveStatus === DiscountEffectiveStatus.Draft
          ? `Created ${formatDiscountDate(discount.createdAt)}`
          : `Updated ${formatDiscountDate(discount.updatedAt)}`}
      </Typography.Text>
    </Flex>
  );

  return (
    <Paper data-testid="discount-summary-section">
      <PaperHeader
        title={statusTitle}
        className={styles.header}
        actions={
          onEdit ? (
            <Button
              size="small"
              icon={<LuEllipsis />}
              aria-label="Edit discount summary"
              onClick={onEdit}
            />
          ) : undefined
        }
      />

      <Flex vertical gap={6}>
        <Typography.Title
          level={3}
          ellipsis={{ rows: 2, tooltip: title }}
          className={styles.title}
          data-testid="discount-detail-title"
        >
          {title}
        </Typography.Title>
        <Flex align="center" gap={8} className={styles.chips}>
          <IdentityChip
            label="Method"
            value={formatDiscountMethod(discount.method)}
          />
          <IdentityChip label="Type" value={formatDiscountKind(discount.kind)} />
          <CopyableChip
            label="ID"
            value={discount.id}
            displayValue={getShortDiscountId(discount.id)}
            mono
          />
          <IdentityChip label="Currency" value={currency ?? "Not configured"} />
        </Flex>
      </Flex>

      <Divider className={styles.divider} />

      <Flex
        align="center"
        justify="space-between"
        gap={12}
        className={styles.summaryControls}
      >
        <Segmented
          size="small"
          value="7 days"
          options={["7 days", "30 days", "90 days"]}
          className={styles.periodControl}
        />
        <Flex align="center" gap={6}>
          <Typography.Text type="secondary">Compare</Typography.Text>
          <Switch size="small" aria-label="Compare discount metrics" />
        </Flex>
      </Flex>

      <div className={styles.kpiGrid}>
        <KPITile
          label="Orders"
          value={formatDiscountCount(discount.redemptions.totalCount)}
        />
        <KPITile
          label="Uses"
          value={formatDiscountCount(discount.usage.consumedCount)}
        />
        <KPITile
          label="Discounted sales"
          value={
            discountedSales == null
              ? "$0"
              : new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: currency ?? "USD",
                  maximumFractionDigits: 0,
                }).format(discountedSales / 100)
          }
        />
        <KPITile
          label="Avg. discount"
          value={averageDiscount}
        />
      </div>
    </Paper>
  );
}
