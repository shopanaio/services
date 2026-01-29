/**
 * Input for root workflow — receives flat operations from resolver
 */
export interface ProductBulkEditInput {
  operations: FlatOperation[];
}

/**
 * Flat operation — one row in bulk_edit_items
 */
export interface FlatOperation {
  productId: string;
  variantId: string | null;
  opType: string;
  opIndex: number;
  params: unknown;
}

/**
 * Result of root workflow
 */
export interface ProductBulkEditResult {
  jobId: string;
}

/**
 * Input for child workflow — only itemId, everything else from DB
 */
export interface OperationWorkflowInput {
  itemId: string;
}

/**
 * Result of child workflow — success/errors
 */
export interface OperationResult {
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
