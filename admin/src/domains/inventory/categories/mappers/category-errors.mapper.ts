import type { ApiGenericUserError, ApiOperationResult } from "@/graphql/types";

export type CategoryFormErrorField =
  | "name"
  | "handle"
  | "description"
  | "excerpt"
  | "media"
  | "seoTitle"
  | "seoDescription"
  | "ogTitle"
  | "ogDescription"
  | "ogImage"
  | "parentId"
  | "defaultSort"
  | "defaultSortDirection"
  | "status";

export interface CategoryFormError {
  field: CategoryFormErrorField;
  message: string;
}

const FIELD_ALIASES: Record<string, CategoryFormErrorField> = {
  name: "name",
  handle: "handle",
  description: "description",
  content: "description",
  excerpt: "excerpt",
  media: "media",
  mediaFileIds: "media",
  fileIds: "media",
  seo: "seoTitle",
  seoTitle: "seoTitle",
  seoDescription: "seoDescription",
  ogTitle: "ogTitle",
  ogDescription: "ogDescription",
  ogImage: "ogImage",
  ogImageId: "ogImage",
  hierarchy: "parentId",
  parentId: "parentId",
  sort: "defaultSort",
  defaultSort: "defaultSort",
  defaultSortDirection: "defaultSortDirection",
  status: "status",
};

export function mapCategoryUserErrorToFormError(
  error: ApiGenericUserError,
): CategoryFormError | null {
  const fieldPath = error.field ?? [];
  const field = [...fieldPath].reverse().find((part) => FIELD_ALIASES[part]);

  if (!field) {
    return null;
  }

  return {
    field: FIELD_ALIASES[field],
    message: error.message,
  };
}

export function mapCategoryUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): CategoryFormError[] {
  return errors
    .map((error) => mapCategoryUserErrorToFormError(error))
    .filter((error): error is CategoryFormError => error !== null);
}

export interface CategoryUpdateErrorSource {
  userErrors: ApiGenericUserError[];
  operationResults: ApiOperationResult[];
}

function formatOperationType(type: ApiOperationResult["type"]): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeCategoryUpdateErrors(
  result: CategoryUpdateErrorSource,
): ApiGenericUserError[] {
  const errors = [...result.userErrors];

  for (const operationResult of result.operationResults) {
    errors.push(...operationResult.errors);

    if (!operationResult.applied && operationResult.errors.length === 0) {
      errors.push({
        code: "OPERATION_NOT_APPLIED",
        message: `${formatOperationType(operationResult.type)} was not applied.`,
      });
    }
  }

  return errors;
}
