import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../kernel/BaseScript.js";
import type { ProductOptionCategory } from "../../../repositories/models/index.js";
export interface ProductOptionCategoryCreateInput {
  readonly name: string;
  readonly slug: string;
  readonly context: DurableWorkflowContext;
}
export interface ProductOptionCategoryCreateResult {
  readonly productOptionCategory: { readonly id: string } | null;
  readonly userErrors: readonly UserError[];
}
export interface ProductOptionCategoryCreateScriptParams {
  name: string;
  slug: string;
}
export interface ProductOptionCategoryCreateScriptResult {
  category?: ProductOptionCategory;
  userErrors: UserError[];
}
