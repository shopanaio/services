import { gql } from "@apollo/client";
import type { TypedDocumentNodeLike } from "@shopana/admin-app-sdk";
import { SMTP_CONNECTION_FIELDS } from "./fragments";
import type {
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
` as TypedDocumentNodeLike<
  SmtpConnectionsQueryData,
  SmtpConnectionsQueryVariables
>;
