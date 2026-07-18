"use client";

import { useState, type ReactNode } from "react";
import { Button, Divider, Flex, Tag, Typography } from "antd";
import {
  LuArchive,
  LuCircleCheck,
  LuCirclePause,
  LuClock3,
  LuEllipsis,
  LuFilePenLine,
  LuTimerOff,
} from "react-icons/lu";
import { DiscountEffectiveStatus } from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { PeriodSwitch } from "@/domains/inventory/products/components/period-switch";
import { getDiscountKpiFixture, type DiscountKpiPeriod } from "../discount-kpi.fixtures";
import { useDiscountSummaryStyles } from "../discount-details-card.styles";
import {
  formatDiscountDate,
  formatDiscountEnum,
  formatDiscountKind,
  formatDiscountMethod,
  getShortDiscountId,
} from "../formatters";
import type { DiscountSummarySectionProps } from "../types";

const PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const;

const STATUS_PRESENTATION: Record<
  DiscountEffectiveStatus,
  { color: string; icon: ReactNode }
> = {
  [DiscountEffectiveStatus.Active]: {
    color: "success",
    icon: <LuCircleCheck />,
  },
  [DiscountEffectiveStatus.Archived]: {
    color: "default",
    icon: <LuArchive />,
  },
  [DiscountEffectiveStatus.Draft]: {
    color: "default",
    icon: <LuFilePenLine />,
  },
  [DiscountEffectiveStatus.Expired]: {
    color: "error",
    icon: <LuTimerOff />,
  },
  [DiscountEffectiveStatus.Paused]: {
    color: "warning",
    icon: <LuCirclePause />,
  },
  [DiscountEffectiveStatus.Scheduled]: {
    color: "processing",
    icon: <LuClock3 />,
  },
};

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
  onEdit,
}: DiscountSummarySectionProps) {
  const { styles, cx } = useDiscountSummaryStyles();
  const fixture = getDiscountKpiFixture(discount);
  const [period, setPeriod] = useState<DiscountKpiPeriod>(fixture.period);
  const [compareEnabled, setCompareEnabled] = useState(fixture.compareEnabled);
  const status = STATUS_PRESENTATION[discount.effectiveStatus];
  const title = discount.title ?? discount.primaryCode ?? "Untitled discount";

  const statusTitle = (
    <Flex align="center" gap={8} wrap>
      <Tag color={status.color} icon={status.icon} className={styles.statusTag}>
        {formatDiscountEnum(discount.effectiveStatus)}
      </Tag>
      <Typography.Text type="secondary" className={styles.metaText}>
        Updated {formatDiscountDate(discount.updatedAt)}
      </Typography.Text>
    </Flex>
  );

  return (
    <Paper data-testid="discount-summary-section">
      <PaperHeader
        title={statusTitle}
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
          <IdentityChip label="Method" value={formatDiscountMethod(discount.method)} />
          <IdentityChip label="Type" value={formatDiscountKind(discount.kind)} />
          <CopyableChip
            label="ID"
            value={discount.id}
            displayValue={getShortDiscountId(discount.id)}
            mono
          />
          <IdentityChip label="Currency" value={discount.currency} />
        </Flex>
      </Flex>

      <Divider className={styles.divider} />

      <Flex vertical gap={8}>
        <PeriodSwitch
          periods={PERIODS}
          value={period}
          onChange={setPeriod}
          showCompare
          compareEnabled={compareEnabled}
          onCompareChange={setCompareEnabled}
        />

        <div className={styles.kpiGrid}>
          {fixture.metrics.map((metric) => (
            <div className={styles.kpiTile} key={metric.label}>
              <Typography.Text className={styles.kpiLabel}>
                {metric.label}
              </Typography.Text>
              <Flex align="end" justify="space-between" gap={8}>
                <Typography.Text className={styles.kpiValue} title={metric.value}>
                  {metric.value}
                </Typography.Text>
                <Typography.Text
                  className={cx(
                    styles.trend,
                    metric.trendDirection === "positive"
                      ? styles.trendPositive
                      : styles.trendNeutral,
                  )}
                >
                  {metric.trend}
                </Typography.Text>
              </Flex>
            </div>
          ))}
        </div>
      </Flex>
    </Paper>
  );
}
