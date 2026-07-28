import { gql } from "@apollo/client";
import type { TypedDocumentNodeLike } from "@shopana/admin-app-sdk";
import { HEADLESS_STOREFRONT_FIELDS } from "./fragments";
import type {
  HeadlessStorefrontActionMutationData,
  HeadlessStorefrontActionMutationVariables,
  HeadlessStorefrontCreateMutationData,
  HeadlessStorefrontCreateMutationVariables,
  HeadlessStorefrontUpdateMutationData,
  HeadlessStorefrontUpdateMutationVariables,
  StorefrontAccessPolicyUpdateMutationData,
  StorefrontAccessPolicyUpdateMutationVariables,
  StorefrontPrivateCredentialCreateMutationData,
  StorefrontPrivateCredentialCreateMutationVariables,
} from "./operation-types";

export const HEADLESS_STOREFRONT_CREATE_MUTATION = gql`
  mutation HeadlessStorefrontCreate($input: HeadlessStorefrontCreateInput!) {
    headlessAppMutation {
      headlessStorefrontCreate(input: $input) {
        connection {
          ...HeadlessStorefrontFields
        }
        initialStorefrontCredentials {
          publicAccessToken
          privateAccessToken
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${HEADLESS_STOREFRONT_FIELDS}
` as TypedDocumentNodeLike<
  HeadlessStorefrontCreateMutationData,
  HeadlessStorefrontCreateMutationVariables
>;

export const HEADLESS_STOREFRONT_UPDATE_MUTATION = gql`
  mutation HeadlessStorefrontUpdate($input: HeadlessStorefrontUpdateInput!) {
    headlessAppMutation {
      headlessStorefrontUpdate(input: $input) {
        connection {
          ...HeadlessStorefrontFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${HEADLESS_STOREFRONT_FIELDS}
` as TypedDocumentNodeLike<
  HeadlessStorefrontUpdateMutationData,
  HeadlessStorefrontUpdateMutationVariables
>;

export const HEADLESS_STOREFRONT_SUSPEND_MUTATION = gql`
  mutation HeadlessStorefrontSuspend($input: HeadlessStorefrontActionInput!) {
    headlessAppMutation {
      headlessStorefrontSuspend(input: $input) {
        connection {
          ...HeadlessStorefrontFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${HEADLESS_STOREFRONT_FIELDS}
` as TypedDocumentNodeLike<
  HeadlessStorefrontActionMutationData,
  HeadlessStorefrontActionMutationVariables
>;

export const HEADLESS_STOREFRONT_RESUME_MUTATION = gql`
  mutation HeadlessStorefrontResume($input: HeadlessStorefrontActionInput!) {
    headlessAppMutation {
      headlessStorefrontResume(input: $input) {
        connection {
          ...HeadlessStorefrontFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${HEADLESS_STOREFRONT_FIELDS}
` as TypedDocumentNodeLike<
  HeadlessStorefrontActionMutationData,
  HeadlessStorefrontActionMutationVariables
>;

export const HEADLESS_STOREFRONT_DISCONNECT_MUTATION = gql`
  mutation HeadlessStorefrontDisconnect($input: HeadlessStorefrontActionInput!) {
    headlessAppMutation {
      headlessStorefrontDisconnect(input: $input) {
        connection {
          ...HeadlessStorefrontFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${HEADLESS_STOREFRONT_FIELDS}
` as TypedDocumentNodeLike<
  HeadlessStorefrontActionMutationData,
  HeadlessStorefrontActionMutationVariables
>;

export const STOREFRONT_ACCESS_POLICY_UPDATE_MUTATION = gql`
  mutation StorefrontAccessPolicyUpdate(
    $input: StorefrontAccessPolicyUpdateInput!
  ) {
    headlessAppMutation {
      storefrontAccessPolicyUpdate(input: $input) {
        policy {
          permissions
          revision
          updatedAt
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
` as TypedDocumentNodeLike<
  StorefrontAccessPolicyUpdateMutationData,
  StorefrontAccessPolicyUpdateMutationVariables
>;

export const STOREFRONT_PRIVATE_CREDENTIAL_CREATE_MUTATION = gql`
  mutation StorefrontPrivateCredentialCreate(
    $input: StorefrontPrivateCredentialCreateInput!
  ) {
    headlessAppMutation {
      storefrontPrivateCredentialCreate(input: $input) {
        credential {
          id
          kind
          status
          label
          tokenHint
          createdAt
          lastUsedAt
          revokedAt
        }
        privateAccessToken
        userErrors {
          code
          field
          message
        }
      }
    }
  }
` as TypedDocumentNodeLike<
  StorefrontPrivateCredentialCreateMutationData,
  StorefrontPrivateCredentialCreateMutationVariables
>;
