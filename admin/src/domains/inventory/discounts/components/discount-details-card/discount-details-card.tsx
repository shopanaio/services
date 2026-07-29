"use client";

import { Flex } from "antd";
import { useDefaultCurrency } from "@/domains/workspace";
import {
  AppliesToSection,
  AvailabilityLimitsSection,
  ChannelsSection,
  CombinationsSection,
  CustomerEligibilitySection,
  DiscountCodesSection,
  DiscountSummarySection,
  DiscountTagsSection,
  ExternalReferencesSection,
  ValueUsageSection,
} from "./sections";
import { useDiscountDetailsCardStyles } from "./discount-details-card.styles";
import type { DiscountDetailsCardProps } from "./types";

export function DiscountDetailsCard({
  discount,
  onEditSection,
  editableSections,
  onRefresh,
  onArchived,
  onViewActivity,
}: DiscountDetailsCardProps) {
  const { styles } = useDiscountDetailsCardStyles();
  const currency = useDefaultCurrency() ?? discount.currency;
  const editHandler = (section: Parameters<NonNullable<typeof onEditSection>>[0]) =>
    onEditSection && (!editableSections || editableSections.includes(section))
      ? () => onEditSection(section)
      : undefined;

  return (
    <Flex
      vertical
      gap={12}
      className={styles.card}
      data-testid="discount-details-card"
    >
      <DiscountSummarySection
        discount={discount}
        currency={currency}
        onEdit={editHandler("summary")}
        onEditValueTargets={editHandler("value-usage")}
        onRefresh={onRefresh}
        onArchived={onArchived}
      />
      <ValueUsageSection
        discount={discount}
        currency={currency}
        onEdit={editHandler("value-usage")}
        onViewActivity={onViewActivity}
      />
      <AppliesToSection
        discount={discount}
        onEdit={editHandler("targets")}
      />
      <CustomerEligibilitySection
        discount={discount}
        onEdit={editHandler("eligibility")}
      />
      <ChannelsSection
        discount={discount}
        onEdit={editHandler("channels")}
      />
      <CombinationsSection
        discount={discount}
        onEdit={editHandler("combinations")}
      />
      <AvailabilityLimitsSection
        discount={discount}
        onEdit={editHandler("availability")}
      />
      <DiscountTagsSection
        discount={discount}
        onRefresh={onRefresh}
      />
      <DiscountCodesSection
        discount={discount}
        onEdit={editHandler("codes")}
      />
      <ExternalReferencesSection
        discount={discount}
        onEdit={editHandler("external-references")}
      />
    </Flex>
  );
}
