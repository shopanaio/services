import { gql } from "@apollo/client";
import type { TypedDocumentNodeLike } from "@shopana/admin-app-sdk";
import { SMTP_CONNECTION_FIELDS } from "./fragments";
import type {
  SmtpConnectionActionMutationData,
  SmtpConnectionActionMutationVariables,
  SmtpConnectionCreateMutationData,
  SmtpConnectionCreateMutationVariables,
  SmtpConnectionUpdateMutationData,
  SmtpConnectionUpdateMutationVariables,
} from "./operation-types";

export const SMTP_CONNECTION_CREATE_MUTATION = gql`
  mutation SmtpConnectionCreate($input: SmtpConnectionCreateInput!) {
    smtpAppMutation {
      smtpConnectionCreate(input: $input) {
        connection {
          ...SmtpConnectionFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${SMTP_CONNECTION_FIELDS}
` as TypedDocumentNodeLike<SmtpConnectionCreateMutationData, SmtpConnectionCreateMutationVariables>;

export const SMTP_CONNECTION_UPDATE_MUTATION = gql`
  mutation SmtpConnectionUpdate($input: SmtpConnectionUpdateInput!) {
    smtpAppMutation {
      smtpConnectionUpdate(input: $input) {
        connection {
          ...SmtpConnectionFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${SMTP_CONNECTION_FIELDS}
` as TypedDocumentNodeLike<SmtpConnectionUpdateMutationData, SmtpConnectionUpdateMutationVariables>;

export const SMTP_CONNECTION_ACTIVATE_MUTATION = gql`
  mutation SmtpConnectionActivate($input: SmtpConnectionActionInput!) {
    smtpAppMutation {
      smtpConnectionActivate(input: $input) {
        connection {
          ...SmtpConnectionFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${SMTP_CONNECTION_FIELDS}
` as TypedDocumentNodeLike<SmtpConnectionActionMutationData, SmtpConnectionActionMutationVariables>;

export const SMTP_CONNECTION_DISCONNECT_MUTATION = gql`
  mutation SmtpConnectionDisconnect($input: SmtpConnectionActionInput!) {
    smtpAppMutation {
      smtpConnectionDisconnect(input: $input) {
        connection {
          ...SmtpConnectionFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${SMTP_CONNECTION_FIELDS}
` as TypedDocumentNodeLike<SmtpConnectionActionMutationData, SmtpConnectionActionMutationVariables>;
