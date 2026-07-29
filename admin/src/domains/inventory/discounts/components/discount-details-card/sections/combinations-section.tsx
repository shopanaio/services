"use client";

import { Button, Dropdown, Flex, Tag, Typography } from "antd";
import {
  LuBoxes,
  LuEllipsis,
  LuPackage,
  LuReceiptText,
  LuTruck,
} from "react-icons/lu";
import type { ApiDiscount } from "@/graphql/types";
import { DiscountClass } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { DiscountSectionIcon } from "../discount-section-icon";
import { useDiscountSectionStyles } from "../discount-details-card.styles";

interface CombinationsSectionProps {
  discount: ApiDiscount;
  onEdit?: () => void;
}

const COMBINATION_OPTIONS = [
  {
    value: DiscountClass.Product,
    title: "Product discounts",
    description: "Multiple can apply per order",
    icon: <LuPackage />,
  },
  {
    value: DiscountClass.Order,
    title: "Order discounts",
    description: "Multiple can apply per order",
    icon: <LuReceiptText />,
  },
  {
    value: DiscountClass.Shipping,
    title: "Shipping discounts",
    description: "Only one can apply per order (best value wins)",
    icon: <LuTruck />,
  },
] as const;

export function CombinationsSection({
  discount,
  onEdit,
}: CombinationsSectionProps) {
  const { styles, cx } = useDiscountSectionStyles();
  const enabledClasses = new Set(
    discount.combinations.map((combination) => combination.discountClass),
  );

  return (
    <Paper
      className={styles.section}
      data-testid="discount-combinations-section"
    >
      <PaperHeader
        title="Combinations"
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
                    onClick: onEdit,
                  },
                ],
              }}
            >
              <Button
                size="small"
                icon={<LuEllipsis />}
                aria-label="Discount combination actions"
              />
            </Dropdown>
          ) : undefined
        }
      />
      {discount.combinations.length === 0 ? (
        <>
          <EntityDetailsEmptyState
            icon={<LuBoxes />}
            state={{
              title: "No combinations enabled",
              description:
                "Choose which other discount classes can be combined with this discount.",
            }}
          />
          <Typography.Text className={styles.caption}>
            0 of {COMBINATION_OPTIONS.length} enabled
          </Typography.Text>
        </>
      ) : (
        <>
          <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
            This discount can be combined with the following discounts in the
            customer&apos;s cart.
          </Typography.Paragraph>
          <div className={styles.optionList}>
            {COMBINATION_OPTIONS.map((option) => {
              const enabled = enabledClasses.has(option.value);
              return (
                <div
                  className={cx(
                    styles.option,
                    enabled && styles.optionEnabled,
                  )}
                  key={option.value}
                >
                  <Flex align="center" justify="space-between" gap={12}>
                    <Flex align="center" gap={10}>
                      <DiscountSectionIcon
                        icon={option.icon}
                        shape="square"
                        size={32}
                        tone={enabled ? "primaryOutline" : "neutral"}
                      />
                      <Flex vertical>
                        <Typography.Text strong>
                          {option.title}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {option.description}
                        </Typography.Text>
                      </Flex>
                    </Flex>
                    <Tag>0</Tag>
                  </Flex>
                </div>
              );
            })}
          </div>
          <Typography.Text className={styles.caption}>
            {enabledClasses.size} of {COMBINATION_OPTIONS.length} enabled
          </Typography.Text>
        </>
      )}
    </Paper>
  );
}
