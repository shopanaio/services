"use client";

import {
  Button,
  Dropdown,
  Flex,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  LuCalendarClock,
  LuEllipsis,
  LuTicketCheck,
} from "react-icons/lu";
import type { ApiDiscount } from "@/graphql/types";
import {
  DiscountEffectiveStatus,
  DiscountMethod,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { useDiscountSectionStyles } from "../discount-details-card.styles";
import {
  formatDiscountCount,
  formatDiscountDateTime,
} from "../formatters";

interface AvailabilityLimitsSectionProps {
  discount: ApiDiscount;
  onEdit?: () => void;
}

export function AvailabilityLimitsSection({
  discount,
  onEdit,
}: AvailabilityLimitsSectionProps) {
  const { styles } = useDiscountSectionStyles();
  const purchaseModes = [
    discount.appliesOnOneTimePurchase ? "One-time purchases" : null,
    discount.appliesOnSubscription ? "Subscription" : null,
  ].filter(Boolean);
  const isUnconfiguredDraft =
    discount.effectiveStatus === DiscountEffectiveStatus.Draft &&
    !discount.rule;

  return (
    <Paper
      className={styles.section}
      data-testid="discount-availability-limits-section"
    >
      <PaperHeader
        title="Availability & limits"
        className={styles.compactHeader}
        actions={
          onEdit ? (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "edit",
                    label: "Edit availability, limits & combinations",
                    "data-testid": "discount-availability-edit-menu-item",
                    onClick: onEdit,
                  },
                ],
              }}
            >
              <Button
                size="small"
                icon={<LuEllipsis />}
                aria-label="Availability and limits actions"
                data-testid="discount-availability-actions"
              />
            </Dropdown>
          ) : undefined
        }
      />

      {isUnconfiguredDraft ? (
        <EntityDetailsEmptyState
          icon={<LuCalendarClock />}
          state={{
            title: "Schedule and limits not configured",
            description:
              "Add availability dates, purchase modes, and usage limits.",
          }}
        />
      ) : (
        <div className={styles.scheduleGrid}>
          <Timeline
            className={styles.availabilityTimeline}
            items={[
              {
                color: "blue",
                children: (
                  <Flex vertical>
                    <Typography.Text type="secondary">Starts</Typography.Text>
                    <Typography.Text strong>
                      {discount.startsAt
                        ? formatDiscountDateTime(discount.startsAt)
                        : "Not configured"}
                    </Typography.Text>
                  </Flex>
                ),
              },
              {
                color: "gray",
                children: (
                  <Flex vertical>
                    <Typography.Text type="secondary">Ends</Typography.Text>
                    <Typography.Text strong>
                      {discount.endsAt
                        ? formatDiscountDateTime(discount.endsAt)
                        : "No end date"}
                    </Typography.Text>
                  </Flex>
                ),
              },
            ]}
          />

          <div className={styles.policyCard}>
            <Flex align="center" justify="space-between" gap={8}>
              <Flex vertical>
                <Typography.Text type="secondary">
                  Purchase modes
                </Typography.Text>
                <Typography.Text strong>
                  {purchaseModes.length > 0
                    ? purchaseModes.join(" and ")
                    : "Not configured"}
                </Typography.Text>
              </Flex>
              <Tag color="blue">
                {discount.method === DiscountMethod.Automatic
                  ? "Automatic"
                  : "Code"}
              </Tag>
            </Flex>
            <Flex
              align="center"
              justify="space-between"
              gap={8}
              style={{ marginTop: 8 }}
            >
              <Flex align="center" gap={6}>
                <LuTicketCheck />
                <Typography.Text>
                  {discount.usageLimit == null
                    ? "No usage limit"
                    : `Limit · ${formatDiscountCount(discount.usageLimit)} uses`}
                </Typography.Text>
              </Flex>
              {discount.method === DiscountMethod.Code && (
                <Typography.Text type="secondary">
                  {discount.appliesOncePerCustomer
                    ? "Once per customer"
                    : "Multiple uses allowed"}
                </Typography.Text>
              )}
            </Flex>
          </div>
        </div>
      )}
    </Paper>
  );
}
