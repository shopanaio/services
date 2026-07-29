"use client";

import { Button, Flex, Tag, Typography } from "antd";
import { LuEllipsis, LuTicket } from "react-icons/lu";
import type { ApiDiscount } from "@/graphql/types";
import {
  DiscountCodeStatus,
  DiscountEffectiveStatus,
  DiscountMethod,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { DiscountSectionIcon } from "../discount-section-icon";
import { useDiscountSectionStyles } from "../discount-details-card.styles";
import {
  formatDiscountCompactDate,
  formatDiscountCount,
} from "../formatters";

interface DiscountCodesSectionProps {
  discount: ApiDiscount;
  onEdit?: () => void;
}

export function DiscountCodesSection({
  discount,
  onEdit,
}: DiscountCodesSectionProps) {
  const { styles } = useDiscountSectionStyles();
  const codes = discount.codes.edges.map((edge) => edge.node);

  return (
    <Paper className={styles.section} data-testid="discount-codes-section">
      <PaperHeader
        title="Discount codes"
        className={styles.compactHeader}
        actions={
          <Button
            size="small"
            icon={<LuEllipsis />}
            aria-label="Edit discount codes"
            onClick={onEdit}
          />
        }
      />

      {codes.length > 0 ? (
        <Flex vertical gap={8}>
          <div className={styles.codeList}>
            {codes.map((code) => (
              <div className={styles.codeRow} key={code.id}>
                <div className={styles.codeRowContent}>
                  <DiscountSectionIcon
                    icon={<LuTicket />}
                    shape="square"
                    size={32}
                    tone={
                      code.status === DiscountCodeStatus.Active
                        ? "primary"
                        : "neutral"
                    }
                  />
                  <div className={styles.codeDetails}>
                    <Typography.Text
                      strong
                      className={styles.codeValue}
                    >
                      {code.code}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      className={styles.codeMeta}
                    >
                      {code.disabledAt
                        ? `Disabled ${formatDiscountCompactDate(code.disabledAt)}`
                        : `${
                            discount.primaryCode === code.code
                              ? "Primary · "
                              : ""
                          }Updated ${formatDiscountCompactDate(code.updatedAt)}`}
                    </Typography.Text>
                  </div>
                  <Flex
                    vertical
                    align="end"
                    className={styles.codeUsage}
                  >
                    <Typography.Text
                      strong
                      className={styles.codeUsagePrimary}
                    >
                      {formatDiscountCount(code.usageCount)} used ·{" "}
                      {formatDiscountCount(code.reservedCount)} reserved
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      className={styles.codeUsageSecondary}
                    >
                      {code.remainingCount == null
                        ? "unlimited"
                        : `${formatDiscountCount(code.remainingCount)} remaining`}
                    </Typography.Text>
                  </Flex>
                  <Flex
                    align="center"
                    justify="flex-end"
                    gap={6}
                    className={styles.codeStatuses}
                  >
                    {discount.primaryCode === code.code && (
                      <Tag color="blue">Primary</Tag>
                    )}
                    <Tag
                      color={
                        code.status === DiscountCodeStatus.Active
                          ? "success"
                          : "default"
                      }
                    >
                      {code.status === DiscountCodeStatus.Active
                        ? "Active"
                        : "Disabled"}
                    </Tag>
                  </Flex>
                </div>
              </div>
            ))}
          </div>
          {discount.codes.totalCount > codes.length && (
            <Typography.Text type="secondary">
              Showing {codes.length} of{" "}
              {formatDiscountCount(discount.codes.totalCount)} codes
            </Typography.Text>
          )}
        </Flex>
      ) : discount.method === DiscountMethod.Automatic &&
        discount.effectiveStatus !== DiscountEffectiveStatus.Draft ? (
        <div className={styles.inlineEmpty}>
          <DiscountSectionIcon
            icon={<LuTicket />}
            shape="square"
            size={32}
            tone="neutral"
          />
          <Flex vertical align="start">
            <Typography.Text strong>No redeem codes</Typography.Text>
            <Typography.Text type="secondary">
              Automatic discounts apply without a code at checkout.
            </Typography.Text>
          </Flex>
        </div>
      ) : (
        <EntityDetailsEmptyState
          icon={<LuTicket />}
          state={{
            title: "No discount codes created",
            description:
              "Create a code after the discount method and value are configured.",
          }}
        />
      )}
    </Paper>
  );
}
