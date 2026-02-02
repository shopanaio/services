import type { ProductUpdateOperation, WorkflowContext } from "./ProductUpdateWorkflowDto.js";

/**
 * Input for refactored bulk edit workflow.
 * Uses same operation format as ProductUpdateWorkflow.
 */
export interface ProductBulkEditInput {
  products: ProductBulkUpdateItem[];
  context: WorkflowContext;
}

/**
 * A single product's update within bulk request.
 */
export interface ProductBulkUpdateItem {
  productId: string;
  expectedRevision?: number;
  operations: ProductUpdateOperation[];
}

/**
 * Result of root workflow
 */
export interface ProductBulkEditResult {
  jobId: string;
}

/**
 * Result from executing a single product group.
 */
export interface ProductGroupResult {
  productId: string;
  applied: boolean;
  errors: BulkEditError[];
}

/**
 * Operation error
 */
export interface BulkEditError {
  message: string;
  code: string;
  field?: string[];
}
