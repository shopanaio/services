import type { ApiSalesChannelConnectionCreateInput } from "@/graphql/types";

export interface CreateConnectionFormValues {
  installationId: string;
  specificationId: string;
  displayName: string;
  configuration?: string;
}

export function toConnectionCreateInput(
  values: CreateConnectionFormValues,
): ApiSalesChannelConnectionCreateInput {
  return {
    installationId: values.installationId,
    specificationId: values.specificationId,
    displayName: values.displayName.trim(),
    configuration: values.configuration?.trim()
      ? JSON.parse(values.configuration)
      : {},
    clientMutationId: crypto.randomUUID(),
  };
}
