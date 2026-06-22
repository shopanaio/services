import type { ApiGenericUserError } from "@/graphql/types";

export type CategoryFormErrorField =
  | "name"
  | "handle"
  | "description"
  | "media";

export interface CategoryFormError {
  field: CategoryFormErrorField;
  message: string;
}

const FIELD_ALIASES: Record<string, CategoryFormErrorField> = {
  name: "name",
  handle: "handle",
  description: "description",
  media: "media",
  mediaFileIds: "media",
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
