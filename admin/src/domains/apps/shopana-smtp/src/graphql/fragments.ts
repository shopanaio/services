import { gql } from "@apollo/client";

export const SMTP_CONNECTION_FIELDS = gql`
  fragment SmtpConnectionFields on SmtpConnection {
    id
    displayName
    provider
    status
    host
    port
    security
    username
    hasPassword
    createdAt
    updatedAt
  }
`;
