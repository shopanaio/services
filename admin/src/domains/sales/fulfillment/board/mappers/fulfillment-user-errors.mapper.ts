import type { FieldPath } from "react-hook-form";
import type { ApiUserError } from "../graphql/operation-types";

export function mapFulfillmentUserErrors<TValues extends Record<string, unknown>>(errors: ApiUserError[]) {
  return errors.map((error) => {
    const field = error.field?.at(-1);
    return { ...error, field: field ? field as FieldPath<TValues> : null };
  });
}
