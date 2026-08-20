import type {
  ApiGenericUserError,
  ApiHeadlessStorefrontConnection,
  ApiHeadlessStorefrontCreateInput,
  ApiHeadlessStorefrontPermissionDefinition,
  ApiHeadlessStorefrontUpdateInput,
  ApiHeadlessStorefrontActionInput,
  ApiStorefrontAccessPolicy,
  ApiStorefrontAccessPolicyUpdateInput,
  ApiStorefrontCredential,
  ApiStorefrontPrivateCredentialCreateInput,
} from "@/graphql/types";

export type HeadlessStorefront = Pick<
  ApiHeadlessStorefrontConnection,
  "id" | "displayName" | "status" | "publicAccessToken" | "createdAt" | "updatedAt"
> & {
  storefrontAccessPolicy: ApiStorefrontAccessPolicy | null;
  storefrontCredentials: ApiStorefrontCredential[];
};

export interface HeadlessStorefrontsQueryData {
  headlessAppQuery: {
    headlessStorefrontConnections: HeadlessStorefront[];
    headlessStorefrontPermissionCatalog: ApiHeadlessStorefrontPermissionDefinition[];
    headlessStorefrontDefaultPermissions: string[];
  };
}

export type HeadlessStorefrontsQueryVariables = Record<string, never>;

export interface HeadlessStorefrontQueryData {
  headlessAppQuery: {
    headlessStorefrontConnection: HeadlessStorefront | null;
    headlessStorefrontPermissionCatalog: ApiHeadlessStorefrontPermissionDefinition[];
  };
}

export interface HeadlessStorefrontQueryVariables {
  id: string;
}

interface HeadlessStorefrontMutationPayload {
  connection: HeadlessStorefront | null;
  userErrors: ApiGenericUserError[];
}

export interface HeadlessStorefrontCreateMutationData {
  headlessAppMutation: {
    headlessStorefrontCreate: HeadlessStorefrontMutationPayload & {
      initialStorefrontCredentials: {
        publicAccessToken: string;
        privateAccessToken: string;
      } | null;
    };
  };
}

export interface HeadlessStorefrontCreateMutationVariables {
  input: ApiHeadlessStorefrontCreateInput;
}

export interface HeadlessStorefrontUpdateMutationData {
  headlessAppMutation: {
    headlessStorefrontUpdate: HeadlessStorefrontMutationPayload;
  };
}

export interface HeadlessStorefrontUpdateMutationVariables {
  input: ApiHeadlessStorefrontUpdateInput;
}

export interface HeadlessStorefrontActionMutationData {
  headlessAppMutation: {
    headlessStorefrontSuspend?: HeadlessStorefrontMutationPayload;
    headlessStorefrontResume?: HeadlessStorefrontMutationPayload;
    headlessStorefrontDisconnect?: HeadlessStorefrontMutationPayload;
  };
}

export interface HeadlessStorefrontActionMutationVariables {
  input: ApiHeadlessStorefrontActionInput;
}

export interface StorefrontAccessPolicyUpdateMutationData {
  headlessAppMutation: {
    storefrontAccessPolicyUpdate: {
      policy: ApiStorefrontAccessPolicy | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface StorefrontAccessPolicyUpdateMutationVariables {
  input: ApiStorefrontAccessPolicyUpdateInput;
}

export interface StorefrontPrivateCredentialCreateMutationData {
  headlessAppMutation: {
    storefrontPrivateCredentialCreate: {
      credential: ApiStorefrontCredential | null;
      privateAccessToken: string | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface StorefrontPrivateCredentialCreateMutationVariables {
  input: ApiStorefrontPrivateCredentialCreateInput;
}
