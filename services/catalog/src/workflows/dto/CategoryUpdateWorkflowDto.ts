import type { UserError } from "../../scripts/types/ScriptResult.js";
import type { RichTextInput } from "../../scripts/shared/richText.js";
import type { WorkflowContext } from "./ProductUpdateWorkflowDto.js";
import type { Category } from "../../repositories/models/index.js";

export type { RichTextInput, WorkflowContext };

export interface CategoryUpdateWorkflowInput {
  categoryId: string;
  expectedRevision?: number;
  operations?: CategoryUpdateParams | null;
  context: WorkflowContext;
}

export interface CategoryUpdateParams {
  handle?: string;
  name?: string;
  content?: CategoryContentParams | null;
  seo?: CategorySeoParams | null;
  status?: "published" | "draft";
  media?: CategoryMediaParams;
  hierarchy?: CategoryHierarchyParams | null;
  sort?: CategorySortParams;
}

export interface CategoryContentParams {
  description?: RichTextInput | null;
  excerpt?: RichTextInput | null;
}

export interface CategorySeoParams {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
}

export interface CategoryMediaParams {
  fileIds: string[];
}

export interface CategoryHierarchyParams {
  parentId?: string | null;
}

export interface CategorySortParams {
  defaultSort: "manual" | "price" | "newest" | "name";
  defaultSortDirection: "asc" | "desc";
}

export interface CategoryUpdateWorkflowResult {
  category: { id: string; revision: number } | null;
  operationResults: OperationResult[];
  userErrors: UserError[];
}

export interface OperationResult {
  type: "categoryUpdate";
  applied: boolean;
  errors: UserError[];
}

export interface CategoryChanges {
  categoryId: string;
  product?: {
    categories?: ProductCategoryFieldChanges;
  };
}

export interface ProductCategoryFieldChanges {
  changed: true;
  reason: "assignment" | "categoryFields" | "rank";
  categoryIds?: string[];
}

export interface CategorySectionChanges {
  categoryFields?: {
    affectsProductIndex: boolean;
  };
}

export interface CategoryUpdateSectionResult {
  category?: Category;
  changes?: CategorySectionChanges;
  userErrors: UserError[];
}
