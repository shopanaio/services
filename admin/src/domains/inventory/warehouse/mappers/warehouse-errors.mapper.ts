import type { ApiGenericUserError } from "@/graphql/types";

export type WarehouseFormErrorField = "name" | "code" | "isDefault";

export interface WarehouseFormError {
  field: WarehouseFormErrorField;
  message: string;
}

const FIELD_ALIASES: Record<string, WarehouseFormErrorField> = {
  name: "name",
  code: "code",
  isDefault: "isDefault",
};

export function mapWarehouseUserErrorToFormError(
  error: ApiGenericUserError,
): WarehouseFormError | null {
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

export function mapWarehouseUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): WarehouseFormError[] {
  return errors
    .map((error) => mapWarehouseUserErrorToFormError(error))
    .filter((error): error is WarehouseFormError => error !== null);
}
