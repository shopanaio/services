import { gql } from "@apollo/client";
import type { TypedDocumentNodeLike } from "@shopana/admin-app-sdk";
import { SMTP_CONNECTION_FIELDS } from "./fragments";
import type {
  SmtpConnectionQueryData,
  SmtpConnectionQueryVariables,
  SmtpConnectionsQueryData,
  SmtpConnectionsQueryVariables,
} from "./operation-types";

export const SMTP_CONNECTIONS_QUERY = gql`
  query SmtpConnections {
    smtpAppQuery {
      smtpProviderPresets {
        provider
        label
        host
        port
        security
        username
      }
      smtpConnections {
        ...SmtpConnectionFields
      }
    }
  }
  ${SMTP_CONNECTION_FIELDS}
` as TypedDocumentNodeLike<SmtpConnectionsQueryData, SmtpConnectionsQueryVariables>;

export const SMTP_CONNECTION_QUERY = gql`
  query SmtpConnection($id: ID!) {
    smtpAppQuery {
      smtpProviderPresets {
        provider
        label
        host
        port
        security
        username
      }
      smtpConnection(id: $id) {
        ...SmtpConnectionFields
      }
    }
  }
  ${SMTP_CONNECTION_FIELDS}
` as TypedDocumentNodeLike<SmtpConnectionQueryData, SmtpConnectionQueryVariables>;
