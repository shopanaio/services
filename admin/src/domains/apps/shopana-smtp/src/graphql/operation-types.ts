import type {
  ApiGenericUserError,
  ApiSmtpConnection,
  ApiSmtpConnectionActionInput,
  ApiSmtpConnectionCreateInput,
  ApiSmtpConnectionUpdateInput,
  ApiSmtpProviderPreset,
} from "@/graphql/types";

export type SmtpConnection = Pick<
  ApiSmtpConnection,
  | "id"
  | "displayName"
  | "provider"
  | "status"
  | "host"
  | "port"
  | "security"
  | "username"
  | "hasPassword"
  | "createdAt"
  | "updatedAt"
>;

export type SmtpProviderPreset = Pick<
  ApiSmtpProviderPreset,
  "provider" | "label" | "host" | "port" | "security" | "username"
>;

export interface SmtpConnectionsQueryData {
  smtpAppQuery: {
    smtpConnections: SmtpConnection[];
    smtpProviderPresets: SmtpProviderPreset[];
  };
}

export type SmtpConnectionsQueryVariables = Record<string, never>;

interface SmtpConnectionPayload {
  connection: SmtpConnection | null;
  userErrors: ApiGenericUserError[];
}

export interface SmtpConnectionCreateMutationData {
  smtpAppMutation: {
    smtpConnectionCreate: SmtpConnectionPayload;
  };
}

export interface SmtpConnectionCreateMutationVariables {
  input: ApiSmtpConnectionCreateInput;
}

export interface SmtpConnectionUpdateMutationData {
  smtpAppMutation: {
    smtpConnectionUpdate: SmtpConnectionPayload;
  };
}

export interface SmtpConnectionUpdateMutationVariables {
  input: ApiSmtpConnectionUpdateInput;
}

export interface SmtpConnectionActionMutationData {
  smtpAppMutation: {
    smtpConnectionActivate?: SmtpConnectionPayload;
    smtpConnectionDisconnect?: SmtpConnectionPayload;
  };
}

export interface SmtpConnectionActionMutationVariables {
  input: ApiSmtpConnectionActionInput;
}
