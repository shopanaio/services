import type {
  ApiSearchProductBoostCreateInput,
  ApiSearchProductBoostUpdateInput,
} from "@/graphql/types";
import type { ProductBoostFormValues } from "../modals/schema";

function productBoostValues(values: ProductBoostFormValues) {
  return {
    locale: values.locale as never,
    name: values.name.trim(),
    enabled: values.enabled,
    phrases: values.phrases.map(({ value }) => value.trim()),
    productIds: values.products.map(({ id }) => id),
  };
}

export function buildProductBoostCreateInput(
  values: ProductBoostFormValues,
): ApiSearchProductBoostCreateInput {
  return {
    clientMutationId: crypto.randomUUID(),
    ...productBoostValues(values),
  };
}

export function buildProductBoostUpdateInput(
  values: ProductBoostFormValues,
  id: string,
  expectedVersion: number,
): ApiSearchProductBoostUpdateInput {
  return { id, expectedVersion, ...productBoostValues(values) };
}
