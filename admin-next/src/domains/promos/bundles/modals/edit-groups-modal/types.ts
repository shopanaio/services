import type { ApiFile, ApiProduct, ApiVariant } from "@/graphql/types";
import type { BundlePriceType, PricingRuleTemplate } from "../../types";

// ============================================================================
// Row Types
// ============================================================================

export type RowType = "group" | "item";

// ============================================================================
// Table Row
// ============================================================================

export interface ITableRow {
  id: string;
  type: RowType;
  name: string;
  parentId: string | null;
  sortIndex: number;
  level: number; // 0 = group, 1 = item

  // Group-specific fields
  minSelection?: number | null;
  maxSelection?: number | null;

  // Item-specific fields
  itemType?: "PRODUCT" | "VARIANT";
  assignedProduct?: ApiProduct;
  assignedVariant?: ApiVariant;
  excludeAssignedProductVariants?: string[] | null;
  title?: string | null;
  featuredImage?: ApiFile | null;
  minQty?: number | null;
  maxQty?: number | null;
  pricingRule?: PricingRuleTemplate | {
    priceType: BundlePriceType;
    priceValue: number | null;
  };

  // Visible field
  visible?: "yes" | "no";

  // Selected field (pre-selected by default)
  selected?: "yes" | "no";
}
