import type { ApiDiscount, CurrencyCode } from "@/graphql/types";

export type DiscountDetailsSection =
  | "summary"
  | "value-usage"
  | "targets"
  | "eligibility"
  | "channels"
  | "combinations"
  | "availability"
  | "tags"
  | "codes"
  | "external-references";

export interface DiscountDetailsCardProps {
  discount: ApiDiscount;
  onEditSection?: (section: DiscountDetailsSection) => void;
  onViewActivity?: () => void;
  onRefresh?: () => Promise<unknown>;
}

export interface DiscountSummarySectionProps {
  discount: ApiDiscount;
  currency: CurrencyCode | null;
  onEdit?: () => void;
}
