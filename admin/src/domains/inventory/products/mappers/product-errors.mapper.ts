import type { ApiGenericUserError, ApiOperationResult } from "@/graphql/types";

export type ProductFormErrorField =
  | "title"
  | "handle"
  | "description"
  | "media"
  | "options"
  | "variants";

export interface ProductFormError {
  field: ProductFormErrorField;
  message: string;
}

const FIELD_ALIASES: Record<string, ProductFormErrorField> = {
  title: "title",
  handle: "handle",
  description: "description",
  media: "media",
  mediaFileIds: "media",
  options: "options",
  variants: "variants",
};

export function mapProductUserErrorToFormError(
  error: ApiGenericUserError,
): ProductFormError | null {
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

export function mapProductUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): ProductFormError[] {
  return errors
    .map((error) => mapProductUserErrorToFormError(error))
    .filter((error): error is ProductFormError => error !== null);
}

export interface ProductUpdateErrorSource {
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

export function normalizeProductUpdateErrors(
  result: ProductUpdateErrorSource,
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
