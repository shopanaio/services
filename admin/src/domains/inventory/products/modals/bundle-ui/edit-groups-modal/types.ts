import type {
  ApiFile,
  ApiProduct,
  ApiProductComponentGroup,
  ApiProductComponentItem,
  ApiProductComponentPricingTemplate,
  ApiVariant,
  ProductComponentItemType,
} from "@/graphql/types";
import type {
  EditorPriceRule,
} from "@/domains/inventory/products/mappers/product-component-editor.mapper";

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
  sourceGroup?: ApiProductComponentGroup;

  // Item-specific fields
  itemType?: ProductComponentItemType;
  assignedProduct?: ApiProduct;
  assignedVariant?: ApiVariant;
  excludeAssignedProductVariants?: string[] | null;
  title?: string | null;
  featuredImage?: ApiFile | null;
  minQty?: number | null;
  maxQty?: number | null;
  pricingRule?: ApiProductComponentPricingTemplate | EditorPriceRule;
  sourceItem?: ApiProductComponentItem;

  // Visible field
  visible?: "yes" | "no";

  // Selected field (pre-selected by default)
  selected?: "yes" | "no";
}
