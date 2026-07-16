import type { ReactNode } from "react";
import type { IBundleGroup, PricingRuleTemplate, IDependencyRule } from "@/domains/inventory/bundles/types";
import type {
  ApiBundle,
  ApiProductInventoryWidget,
  ApiVariant,
  ApiPageInfo,
} from "@/graphql/types";

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

export interface ProductDetailsSupplementalData {
  bundleItems: IBundleGroup[];
  pricingTemplates: PricingRuleTemplate[];
  dependencyRules: IDependencyRule[];
  inventory: ApiProductInventoryWidget;
  /** Bundles that include this product */
  includedInBundles: ApiBundle[];
}
