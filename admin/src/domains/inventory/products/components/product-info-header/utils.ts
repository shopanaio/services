import {
  CheckCircleFilled,
  ClockCircleFilled,
  StopOutlined,
} from "@ant-design/icons";
import { createElement } from "react";
import { EntityStatus } from "@/mocks/products/types";

// ============================================================================
// Status Configuration
// ============================================================================

export const getStatusConfig = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.PUBLISHED:
      return {
        color: "success" as const,
        icon: createElement(CheckCircleFilled),
        label: "Published",
        hint: null,
      };
    case EntityStatus.DRAFT:
      return {
        color: "default" as const,
        icon: createElement(ClockCircleFilled),
        label: "Draft",
        hint: "Not visible on storefront",
      };
    case EntityStatus.ARCHIVED:
      return {
        color: "error" as const,
        icon: createElement(StopOutlined),
        label: "Archived",
        hint: "Product is archived",
      };
    default:
      return {
        color: "default" as const,
        icon: null,
        label: status,
        hint: null,
      };
  }
};

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
