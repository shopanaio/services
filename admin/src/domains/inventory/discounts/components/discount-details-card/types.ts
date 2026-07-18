import type { DiscountDetailsQueryDiscount } from "../../graphql/operation-types";

export type DiscountDetailsSection = "summary";

export interface DiscountDetailsCardProps {
  discount: DiscountDetailsQueryDiscount;
  onEditSection?: (section: DiscountDetailsSection) => void;
  onViewActivity?: () => void;
  onRefresh?: () => Promise<unknown>;
}

export interface DiscountSummarySectionProps {
  discount: DiscountDetailsQueryDiscount;
  onEdit?: () => void;
}
