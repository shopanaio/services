import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../scripts/types/ScriptResult.js";
export interface CategoryDeleteContext extends DurableWorkflowContext {
  readonly organizationId: string;
  readonly storeId: string;
  readonly locale: string;
  readonly requestId: string;
  readonly userId?: string;
}
export interface CategoryDeleteInput {
  readonly categoryId: string;
  readonly permanent: boolean;
  readonly context: CategoryDeleteContext;
}
export interface CategoryDeleteResult {
  readonly deletedCategoryId: string | null;
  readonly userErrors: readonly UserError[];
}
export interface CategoryDeleteAuditOperation {
  readonly position: 0;
  readonly type: "categoryDelete";
  readonly action: "DELETE";
  readonly target: { readonly type: "category"; readonly id: string };
  readonly changes: readonly {
    readonly path: "category";
    readonly kind: "REMOVE";
    readonly before: { readonly state: "OMITTED" };
  }[];
}
