import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
export interface ProductOptionCategoryDeleteInput {
  readonly productOptionCategoryId: string;
  readonly context: DurableWorkflowContext;
}
export interface ProductOptionCategoryDeleteResult {
  readonly deletedProductOptionCategoryId: string | null;
  readonly userErrors: readonly UserError[];
}
export interface ProductOptionCategoryDeleteScriptParams {
  id: string;
}
export interface ProductOptionCategoryDeleteScriptResult {
  deletedCategoryId?: string;
  userErrors: UserError[];
}
