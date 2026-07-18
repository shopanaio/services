"use client";

import { Flex } from "antd";
import { DiscountSummarySection } from "./sections";
import { useDiscountDetailsCardStyles } from "./discount-details-card.styles";
import type { DiscountDetailsCardProps } from "./types";

export function DiscountDetailsCard({
  discount,
  onEditSection,
}: DiscountDetailsCardProps) {
  const { styles } = useDiscountDetailsCardStyles();

  return (
    <Flex
      vertical
      gap={12}
      className={styles.card}
      data-testid="discount-details-card"
    >
      <DiscountSummarySection
        discount={discount}
        onEdit={
          onEditSection ? () => onEditSection("summary") : undefined
        }
      />
    </Flex>
  );
}
