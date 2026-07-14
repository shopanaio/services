import type { ApiSearchSynonymGroupOperationInput } from "@/graphql/types";
import { SearchConfigurationOperationAction } from "@/graphql/types";
import type { SynonymGroupFormValues } from "../modals/schema";

export function buildSynonymGroupOperation(
  values: SynonymGroupFormValues,
  entityId?: string,
): ApiSearchSynonymGroupOperationInput {
  const common = {
    locale: values.locale as never,
    name: values.name.trim(),
    enabled: values.enabled,
    values: values.values.map(({ value }) => value.trim()),
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
