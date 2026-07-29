"use client";

import { Button, Dropdown, Flex, Tag, Typography } from "antd";
import {
  LuEllipsis,
  LuUsers,
  LuUserRoundCheck,
  LuTriangleAlert,
} from "react-icons/lu";
import type { ApiDiscount } from "@/graphql/types";
import {
  DiscountBuyerContextType,
  DiscountReferenceStatus,
} from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { DiscountSectionIcon } from "../discount-section-icon";
import { useDiscountSectionStyles } from "../discount-details-card.styles";

interface CustomerEligibilitySectionProps {
  discount: ApiDiscount;
  onEdit?: () => void;
}

export function CustomerEligibilitySection({
  discount,
  onEdit,
}: CustomerEligibilitySectionProps) {
  const { styles } = useDiscountSectionStyles();
  const context = discount.buyerContext ?? null;
  const staleCount = context
    ? context.customers.filter(
        (item) => item.referenceStatus === DiscountReferenceStatus.Stale,
      ).length +
      context.segments.filter(
        (item) => item.referenceStatus === DiscountReferenceStatus.Stale,
      ).length
    : 0;

  const renderContent = () => {
    if (!context) {
      return (
        <EntityDetailsEmptyState
          icon={<LuUsers />}
          state={{
            title: "Customer eligibility is not configured",
            description:
              "Configure who can use this discount before activating the draft.",
          }}
        />
      );
    }

    if (context.type === DiscountBuyerContextType.All) {
      return (
        <div className={styles.entityRow}>
          <Flex align="center" justify="space-between" gap={12}>
            <Flex align="center" gap={10}>
              <DiscountSectionIcon
                icon={<LuUserRoundCheck />}
                size={36}
              />
              <Flex vertical>
                <Typography.Text strong>
                  Available to all customers
                </Typography.Text>
                <Typography.Text type="secondary">
                  No customers or segments restrict this discount.
                </Typography.Text>
              </Flex>
            </Flex>
            <Tag color="success">Eligible</Tag>
          </Flex>
        </div>
      );
    }

    if (
      context.type === DiscountBuyerContextType.Customers &&
      context.customers.length > 0
    ) {
      return (
        <div className={styles.entityList}>
          {context.customers.map((item) => (
            <div className={styles.entityRow} key={item.customerId}>
              <Flex align="center" justify="space-between" gap={12}>
                <Flex align="center" gap={10} className={styles.entityTitle}>
                  <DiscountSectionIcon
                    icon={
                      item.referenceStatus === DiscountReferenceStatus.Stale ? (
                        <LuTriangleAlert />
                      ) : (
                        <LuUserRoundCheck />
                      )
                    }
                    tone={
                      item.referenceStatus === DiscountReferenceStatus.Stale
                        ? "warning"
                        : "primary"
                    }
                    size={36}
                  />
                  <Flex vertical className={styles.entityTitle}>
                    <Typography.Text strong ellipsis>
                      {item.customer?.displayName ?? "Unresolved customer"}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {item.customer?.email ??
                        "The customer reference could not be resolved."}
                    </Typography.Text>
                  </Flex>
                </Flex>
                {item.referenceStatus === DiscountReferenceStatus.Stale ? (
                  <Tag color="warning">Stale</Tag>
                ) : (
                  <CopyableChip
                    value={item.customerId}
                    displayValue={item.customerId.slice(0, 8)}
                    mono
                  />
                )}
              </Flex>
            </div>
          ))}
        </div>
      );
    }

    if (
      context.type === DiscountBuyerContextType.Segments &&
      context.segments.length > 0
    ) {
      return (
        <div className={styles.entityList}>
          {context.segments.map((item, index) => (
            <div className={styles.entityRow} key={item.segmentId}>
              <Flex align="center" justify="space-between" gap={12}>
                <Flex align="center" gap={10}>
                  <DiscountSectionIcon
                    icon={
                      item.referenceStatus === DiscountReferenceStatus.Stale ? (
                        <LuTriangleAlert />
                      ) : (
                        <LuUsers />
                      )
                    }
                    tone={
                      item.referenceStatus === DiscountReferenceStatus.Stale
                        ? "warning"
                        : "primary"
                    }
                    size={36}
                  />
                  <Flex vertical>
                    <Typography.Text strong>
                      Customer segment {index + 1}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      Segment identity from Customers
                    </Typography.Text>
                  </Flex>
                </Flex>
                {item.referenceStatus === DiscountReferenceStatus.Stale ? (
                  <Tag color="warning">Stale</Tag>
                ) : (
                  <CopyableChip
                    value={item.segmentId}
                    displayValue={item.segmentId.slice(0, 8)}
                    mono
                  />
                )}
              </Flex>
            </div>
          ))}
        </div>
      );
    }

    return (
      <EntityDetailsEmptyState
        icon={<LuUsers />}
        state={{
          title: "No eligible customers selected",
          description:
            "Choose customers or customer segments that can use this discount.",
        }}
      />
    );
  };

  return (
    <Paper
      className={styles.section}
      data-testid="discount-customer-eligibility-section"
    >
      <PaperHeader
        title="Customer eligibility"
        className={styles.compactHeader}
        actions={
          onEdit ? (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "edit",
                    label: "Edit eligibility & channels",
                    onClick: onEdit,
                  },
                ],
              }}
            >
              <Button
                size="small"
                icon={<LuEllipsis />}
                aria-label="Customer eligibility actions"
              />
            </Dropdown>
          ) : undefined
        }
      />
      {staleCount > 0 && (
        <Flex
          align="flex-start"
          gap={8}
          className={styles.warningBox}
          style={{ marginBottom: 8 }}
        >
          <LuTriangleAlert />
          <Typography.Text>
            {staleCount} eligibility reference{staleCount === 1 ? "" : "s"}{" "}
            could not be resolved.
          </Typography.Text>
        </Flex>
      )}
      {renderContent()}
    </Paper>
  );
}
