"use client";

import type { ReactNode } from "react";
import { Typography } from "antd";
import { createStyles } from "antd-style";
import {
  LuGift as GiftOutlined,
  LuShoppingBag as OrderOutlined,
  LuTags as TagsOutlined,
  LuTruck as TruckOutlined,
} from "react-icons/lu";
import { DiscountKind } from "@/graphql/types";

const useStyles = createStyles(({ token }) => ({
  options: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  option: {
    width: "100%",
    minHeight: 72,
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 16,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 12,
    background: token.colorBgContainer,
    color: token.colorText,
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    boxSizing: "border-box",
    transition: `border-color ${token.motionDurationMid}, background ${token.motionDurationMid}, box-shadow ${token.motionDurationMid}`,
    "&:hover": {
      background: token.colorFillQuaternary,
      borderColor: token.colorPrimaryBorderHover,
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 ${token.controlOutlineWidth}px ${token.controlOutline}`,
    },
  },
  optionSelected: {
    borderColor: token.colorPrimary,
    boxShadow: `inset 0 0 0 1px ${token.colorPrimary}`,
    "&:hover, &:focus-visible": {
      borderColor: token.colorPrimary,
    },
  },
  icon: {
    width: 40,
    height: 40,
    flex: "0 0 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: token.colorFillQuaternary,
    color: token.colorText,
    fontSize: 20,
  },
  iconSelected: {
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
  },
  content: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  title: {
    display: "block",
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.35,
  },
  description: {
    display: "block",
    fontSize: 12,
    lineHeight: 1.35,
  },
}));

interface DiscountTypeOption {
  description: string;
  icon: ReactNode;
  kind: DiscountKind;
  title: string;
}

const OPTIONS: DiscountTypeOption[] = [
  {
    kind: DiscountKind.AmountOffProducts,
    title: "Amount off products",
    description: "Reduce the price of selected products or collections.",
    icon: <TagsOutlined />,
  },
  {
    kind: DiscountKind.BuyXGetY,
    title: "Buy X get Y",
    description: "Reward customers when they buy qualifying items.",
    icon: <GiftOutlined />,
  },
  {
    kind: DiscountKind.AmountOffOrder,
    title: "Amount off order",
    description: "Apply a fixed or percentage discount to the order.",
    icon: <OrderOutlined />,
  },
  {
    kind: DiscountKind.FreeShipping,
    title: "Free shipping",
    description: "Remove shipping costs when conditions are met.",
    icon: <TruckOutlined />,
  },
];

interface DiscountTypeSelectorProps {
  onSelect: (kind: DiscountKind) => void;
  selectedKind?: DiscountKind;
}

export function DiscountTypeSelector({
  onSelect,
  selectedKind,
}: DiscountTypeSelectorProps) {
  const { styles, cx } = useStyles();

  return (
    <div
      className={styles.options}
      data-testid="discount-type-selector"
      role="radiogroup"
      aria-label="Discount type"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.kind}
          type="button"
          className={cx(
            styles.option,
            selectedKind === option.kind && styles.optionSelected,
          )}
          onClick={() => onSelect(option.kind)}
          role="radio"
          aria-checked={selectedKind === option.kind}
          data-testid={`discount-type-${option.kind.toLowerCase()}`}
        >
          <span
            className={cx(
              styles.icon,
              selectedKind === option.kind && styles.iconSelected,
            )}
          >
            {option.icon}
          </span>
          <span className={styles.content}>
            <Typography.Text className={styles.title}>
              {option.title}
            </Typography.Text>
            <Typography.Text type="secondary" className={styles.description}>
              {option.description}
            </Typography.Text>
          </span>
        </button>
      ))}
    </div>
  );
}
