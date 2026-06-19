import type { ApiGenericUserError } from "@/graphql/types";

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
