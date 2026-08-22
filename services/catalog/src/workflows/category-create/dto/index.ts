import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../../scripts/types/ScriptResult.js";
import type { RichTextInput } from "../../../scripts/shared/richText.js";

export interface CategoryCreateContext extends DurableWorkflowContext {
  readonly organizationId: string;
  readonly storeId: string;
  readonly locale: string;
  readonly requestId: string;
  readonly userId?: string;
}
export interface CategoryCreateInput {
  readonly params: CategoryCreateParams;
  readonly context: CategoryCreateContext;
}
export interface CategoryCreateParams {
  readonly handle: string;
  readonly name: string;
  readonly parentId?: string | null;
  readonly description?: RichTextInput | null;
  readonly excerpt?: RichTextInput | null;
  readonly seo?: CategoryCreateSeoParams;
  readonly mediaFileIds?: readonly string[];
  readonly publish?: boolean;
}
export interface CategoryCreateSeoParams {
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly ogTitle?: string | null;
  readonly ogDescription?: string | null;
  readonly ogImageId?: string | null;
}
export interface CategoryCreateResult {
  readonly category: { readonly id: string } | null;
  readonly userErrors: readonly UserError[];
}
export interface CategoryCreateAuditChange {
  readonly path: string;
  readonly kind: "SET";
  readonly after?: { readonly state: "VISIBLE" | "OMITTED"; readonly value?: unknown };
}
export interface CategoryCreateAuditOperation {
  readonly position: 0;
  readonly type: "categoryCreate";
  readonly action: "CREATE";
  readonly target: { readonly type: "category"; readonly id: string };
  readonly changes: readonly CategoryCreateAuditChange[];
}
