import type {
  ApiSearchSynonymGroupCreateInput,
  ApiSearchSynonymGroupUpdateInput,
} from "@/graphql/types";
import type { SynonymGroupFormValues } from "../modals/schema";

function synonymGroupValues(values: SynonymGroupFormValues) {
  return {
    locale: values.locale as never,
    name: values.name.trim(),
    enabled: values.enabled,
    values: values.values.map(({ value }) => value.trim()),
  };
}

export function buildSynonymGroupCreateInput(
  values: SynonymGroupFormValues,
): ApiSearchSynonymGroupCreateInput {
  return {
    clientMutationId: crypto.randomUUID(),
    ...synonymGroupValues(values),
  };
}

export function buildSynonymGroupUpdateInput(
  values: SynonymGroupFormValues,
  id: string,
): ApiSearchSynonymGroupUpdateInput {
  return { id, ...synonymGroupValues(values) };
}
