import type { ApiSearchProductBoostOperationInput } from "@/graphql/types";
import { SearchConfigurationOperationAction } from "@/graphql/types";
import type { ProductBoostFormValues } from "../modals/schema";

export function buildProductBoostOperation(
  values: ProductBoostFormValues,
  entityId?: string,
): ApiSearchProductBoostOperationInput {
  const common = {
    locale: values.locale as never,
    name: values.name.trim(),
    enabled: values.enabled,
    phrases: values.phrases.map(({ value }) => value.trim()),
    productIds: values.products.map(({ id }) => id),
  };

  return entityId
    ? {
        action: SearchConfigurationOperationAction.Update,
        id: entityId,
        ...common,
      }
    : {
        action: SearchConfigurationOperationAction.Create,
        clientMutationId: crypto.randomUUID(),
        ...common,
      };
}
