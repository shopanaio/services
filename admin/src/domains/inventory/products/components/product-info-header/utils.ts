import {
  CheckCircleFilled,
  ClockCircleFilled,
  StopOutlined,
} from "@ant-design/icons";
import { createElement, type ReactNode } from "react";
import {
  PRODUCT_STATUS_COLORS,
  PRODUCT_STATUS_HINTS,
  PRODUCT_STATUS_LABELS,
  type ProductStatus,
} from "../../utils/product-status";

// ============================================================================
// Status Configuration
// ============================================================================

const PRODUCT_STATUS_ICONS = {
  archived: createElement(StopOutlined),
  draft: createElement(ClockCircleFilled),
  published: createElement(CheckCircleFilled),
} satisfies Record<ProductStatus, ReactNode>;

export const getStatusConfig = (status: ProductStatus) => ({
  color: PRODUCT_STATUS_COLORS[status],
  icon: PRODUCT_STATUS_ICONS[status],
  label: PRODUCT_STATUS_LABELS[status],
  hint: PRODUCT_STATUS_HINTS[status],
});

// ============================================================================
// Formatters
// ============================================================================

export const formatNumber = (num: number): string => {
  return num.toLocaleString("ru-RU");
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
