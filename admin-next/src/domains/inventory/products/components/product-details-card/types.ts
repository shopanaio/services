import type { ReactNode } from "react";
import type { ICategory } from "@/mocks/products/types";
import type { ITag } from "../../modals";
import type { IComponentGroup, PricingRuleTemplate, ITieredDiscount, IDependencyRule } from "../../modals/edit-components-modal/types";
import type { IAttributeRow } from "../../modals/edit-attributes-modal/types";
import type { ProductInventoryWidget } from "./inventory-widget.types";
import type {
  ApiVariant,
  ApiVariantConnection,
  ApiPageInfo,
  ApiProductOption,
} from "@/graphql/types";

export type { ProductInventoryWidget, ThresholdType } from "./inventory-widget.types";

// Re-export API types for table usage
export type { ApiVariant, ApiVariantConnection, ApiPageInfo };

// ============================================================================
// Review Types
// ============================================================================

export interface IReviewBreakdown {
  stars: number;
  count: number;
  percent: number;
}

export interface IReviewsData {
  rating: number;
  reviewsCount: number;
  breakdown: IReviewBreakdown[];
}

// ============================================================================
// Section Props
// ============================================================================

export interface ISectionProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  extra?: ReactNode;
}

// ============================================================================
// Variants Table Connection Types
// ============================================================================

export interface IVariantsTableData {
  variants: ApiVariant[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

// ============================================================================
// Mock Data Types
// ============================================================================

export interface IProductDetailsMockData {
  categories: {
    primary: ICategory | null;
    list: ICategory[];
  };
  tags: ITag[];
  reviews: IReviewsData;
  attributes: IAttributeRow[];
  options: ApiProductOption[];
  components: IComponentGroup[];
  pricingTemplates: PricingRuleTemplate[];
  tieredDiscounts: ITieredDiscount[];
  dependencyRules: IDependencyRule[];
  inventory: ProductInventoryWidget;
}
