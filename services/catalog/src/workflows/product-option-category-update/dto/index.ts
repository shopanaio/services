import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { ProductOptionCategory } from "../../../repositories/models/index.js";
export interface ProductOptionCategoryUpdateOperation {
  readonly type: "productOptionCategoryFieldsUpdate";
  readonly name?: string;
  readonly slug?: string;
  readonly fieldPath: readonly string[];
}
export interface ProductOptionCategoryUpdateInput {
  readonly productOptionCategoryId: string;
  readonly operations: readonly ProductOptionCategoryUpdateOperation[];
  readonly context: DurableWorkflowContext;
}
export interface ProductOptionCategoryOperationResult {
  readonly type: ProductOptionCategoryUpdateOperation["type"];
  readonly applied: boolean;
  readonly entityId?: string;
  readonly errors: readonly UserError[];
}
export interface ProductOptionCategoryUpdateResult {
  readonly productOptionCategory: { readonly id: string } | null;
  readonly operationResults: readonly ProductOptionCategoryOperationResult[];
  readonly userErrors: readonly UserError[];
}
export interface ProductOptionCategoryUpdateScriptParams {
  id: string;
  name?: string;
  slug?: string;
}
export interface ProductOptionCategoryUpdateScriptResult {
  category?: ProductOptionCategory;
  userErrors: UserError[];
}
