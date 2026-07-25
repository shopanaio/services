import type {
  ApiAppDefinition,
  ApiGenericUserError,
  ApiSalesChannelConnection,
  ApiSalesChannelConnectionConnection,
  ApiSalesChannelConnectionCreateInput,
  ApiSalesChannelLifecyclePayload,
} from "@/graphql/types";

export interface SalesChannelConnectionsData {
  appsQuery: {
    salesChannelConnections: ApiSalesChannelConnectionConnection;
    availableApps: ApiAppDefinition[];
  };
}

export interface SalesChannelConnectionsVariables {
  first?: number | null;
  after?: string | null;
}

export interface SalesChannelCreateData {
  appsMutation: {
    salesChannelConnectionCreate: ApiSalesChannelLifecyclePayload;
  };
}

export interface SalesChannelCreateVariables {
  input: ApiSalesChannelConnectionCreateInput;
}

export interface SalesChannelMutationResult {
  connection: ApiSalesChannelConnection | null;
  userErrors: ApiGenericUserError[];
}
