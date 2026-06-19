import type { UserError } from "../../scripts/types/ScriptResult.js";
import type { RichTextInput } from "../../scripts/product/dto/shared.js";

export type { RichTextInput };

/**
 * Input for ProductUpdateWorkflow.
 */
export interface ProductUpdateWorkflowInput {
  productId: string;
  expectedRevision?: number;
  operations: ProductUpdateOperation[];
  context: WorkflowContext;
}

/**
 * Context for workflow execution.
 */
export interface WorkflowContext {
  organizationId: string;
  projectId: string;
  storeId: string;
  userId?: string;
  locale: string;
}

/**
 * Operation types - product or variant level updates.
 */
export type ProductUpdateOperation =
  | { type: "productUpdate"; params: ProductUpdateParams }
  | { type: "variantUpdate"; params: VariantUpdateParams };

/**
 * Product-level update parameters.
 * All fields are optional - only provided fields are updated.
 */
export interface ProductUpdateParams {
  id: string;
  handle?: string;
  title?: string;
  content?: ProductContentParams;
  seo?: ProductSeoParams;
  status?: "published" | "draft";
  media?: ProductMediaParams;
}

export interface ProductContentParams {
  description?: RichTextInput | null;
  excerpt?: RichTextInput | null;
}

export interface ProductSeoParams {
  title?: string;
  description?: string;
}

export interface ProductMediaParams {
  fileIds: string[];
}

/**
 * Variant-level update parameters.
 * All fields are optional - only provided fields are updated.
 */
export interface VariantUpdateParams {
  variantId: string;
  pricing?: VariantPricingParams;
  inventory?: VariantInventoryParams;
  dimensions?: VariantDimensionsParams;
  media?: VariantMediaParams;
  options?: VariantOptionsParams;
}

export interface VariantPricingParams {
  currency: string;
  amountMinor: number;
  compareAtMinor?: number;
}

export interface VariantInventoryParams {
  warehouseId: string;
  onHand: number;
  unavailable?: number;
  sku?: string;
  weight?: number;
  unitCostMinor?: number;
  costCurrency?: string;
}

export interface VariantDimensionsParams {
  width: number;
  height: number;
  length: number;
}

export interface VariantMediaParams {
  fileIds: string[];
}

export interface VariantOptionsParams {
  set: VariantOptionLink[];
}

export interface VariantOptionLink {
  optionId: string;
  optionValueId: string;
}

/**
 * Result of ProductUpdateWorkflow.
 */
export interface ProductUpdateWorkflowResult {
  /** Updated product with new revision, or null if failed */
  product: { id: string; revision: number } | null;
  /** Results for each operation */
  operationResults: OperationResult[];
  /** Aggregated errors from all operations */
  userErrors: UserError[];
}

/**
 * Result of a single operation within the workflow.
 */
export interface OperationResult {
  type: "productUpdate" | "variantUpdate";
  applied: boolean;
  errors: UserError[];
}
