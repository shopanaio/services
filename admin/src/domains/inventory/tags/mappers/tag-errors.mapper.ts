import type { ApiGenericUserError } from "@/graphql/types";

export interface TagFormError {
  field: string | null;
  message: string;
}

export function mapTagUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): TagFormError[] {
  return errors.map((error) => ({
    field: error.field?.[0] ?? null,
    message: error.message,
  }));
}
