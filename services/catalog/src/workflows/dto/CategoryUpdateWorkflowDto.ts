import type { DurableWorkflowContext } from "@shopana/shared-kernel";
import type { UserError } from "../../scripts/types/ScriptResult.js";
import type { RichTextInput } from "../../scripts/shared/richText.js";

export type { RichTextInput };

export interface CategoryWorkflowContext extends DurableWorkflowContext {
  readonly organizationId: string;
  readonly storeId: string;
  readonly locale: string;
  readonly requestId: string;
  readonly userId?: string;
}

export interface CategoryCreateWorkflowInput {
  readonly params: CategoryCreateParams;
  readonly context: CategoryWorkflowContext;
}

export interface CategoryCreateParams {
  readonly handle: string;
  readonly name: string;
  readonly parentId?: string | null;
  readonly description?: RichTextInput | null;
  readonly excerpt?: RichTextInput | null;
  readonly seo?: CategorySeoParams;
  readonly mediaFileIds?: readonly string[];
  readonly publish?: boolean;
}

export interface CategoryCreateWorkflowResult {
  readonly category: { readonly id: string } | null;
  readonly userErrors: readonly UserError[];
}

export interface CategoryUpdateWorkflowInput {
  readonly categoryId: string;
  readonly operations: readonly CategoryUpdateOperation[];
  readonly context: CategoryWorkflowContext;
}

interface CategoryOperationMeta {
  readonly fieldPrefix: readonly string[];
}

type CategoryOperationEntry<TType extends string, TParams> = Readonly<{
  type: TType;
  params: TParams;
  meta: CategoryOperationMeta;
}>;

export type CategoryUpdateOperation =
  | CategoryOperationEntry<"categoryUpdate", CategoryFieldsParams>
  | CategoryOperationEntry<"categoryHierarchyMove", CategoryHierarchyMoveParams>
  | CategoryOperationEntry<"categoryHierarchyRebalance", Record<string, never>>
  | CategoryOperationEntry<"categoryComparisonProfileSet", CategoryComparisonProfileSetParams>;

export interface CategoryFieldsParams {
  readonly handle?: string;
  readonly name?: string;
  readonly content?: CategoryContentParams;
  readonly seo?: CategorySeoParams | null;
  readonly status?: "published" | "draft";
  readonly media?: CategoryMediaParams;
  readonly sort?: CategorySortParams;
}

export interface CategoryContentParams {
  readonly description?: RichTextInput | null;
  readonly excerpt?: RichTextInput | null;
}

export interface CategorySeoParams {
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly ogTitle?: string | null;
  readonly ogDescription?: string | null;
  readonly ogImageId?: string | null;
}

export interface CategoryMediaParams {
  readonly fileIds: readonly string[];
}

export interface CategoryHierarchyMoveParams {
  readonly parentId: string | null;
}

export interface CategoryComparisonProfileSetParams {
  readonly profileId: string | null;
}

export interface CategorySortParams {
  readonly defaultSort: "manual" | "price" | "newest" | "name";
  readonly defaultSortDirection: "asc" | "desc";
}

export type CategoryOperationResultType = CategoryUpdateOperation["type"];

export interface CategoryOperationResult {
  readonly type: CategoryOperationResultType;
  readonly applied: boolean;
  readonly entityId?: string;
  readonly errors: readonly UserError[];
}

export interface CategoryUpdateWorkflowResult {
  readonly category: { readonly id: string } | null;
  readonly operationResults: readonly CategoryOperationResult[];
  readonly userErrors: readonly UserError[];
}

export interface CategoryDeleteWorkflowInput {
  readonly categoryId: string;
  readonly permanent: boolean;
  readonly context: CategoryWorkflowContext;
}

export interface CategoryDeleteWorkflowResult {
  readonly deletedCategoryId: string | null;
  readonly userErrors: readonly UserError[];
}

export interface CategoryAuditChange {
  readonly path: string;
  readonly kind: "SET" | "ADD" | "REMOVE" | "MOVE";
  readonly before?: { readonly state: "VISIBLE" | "MASKED" | "OMITTED"; readonly value?: unknown };
  readonly after?: { readonly state: "VISIBLE" | "MASKED" | "OMITTED"; readonly value?: unknown };
}

export interface CategoryAuditOperation {
  readonly position: number;
  readonly type: string;
  readonly action: "CREATE" | "UPDATE" | "DELETE" | "MOVE" | "LINK" | "UNLINK";
  readonly target?: { readonly type: string; readonly id: string };
  readonly changes: readonly CategoryAuditChange[];
}

export interface CategoryChanges {
  readonly categoryId: string;
  auditOperations: CategoryAuditOperation[];
  affectedProductIds: string[];
}

export interface CategoryUpdateSectionResult {
  readonly category?: { readonly id: string };
  readonly changes?: {
    readonly categoryFields?: {
      readonly affectsProductIndex: boolean;
      readonly changedPaths?: readonly string[];
    };
  };
  readonly userErrors: readonly UserError[];
}
