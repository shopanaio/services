import type { ApiGenericUserError } from "@/graphql/types";
import type { CreateDiscountFormValues } from "../modals/create-discount-modal/schema";

export interface DiscountFormError {
  field: keyof CreateDiscountFormValues;
  message: string;
}

export function mapDiscountUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): DiscountFormError[] {
  return errors.flatMap((error) => {
    const path = error.field ?? [];
    const field = path.at(-1);

    if (field !== "kind" && field !== "method" && field !== "title") return [];
    return [{ field, message: error.message }];
  });
}
