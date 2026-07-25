import { gql } from "@apollo/client";
import { SALES_CHANNEL_CONNECTION_FIELDS } from "./fragments";

export const SALES_CHANNEL_CONNECTION_CREATE_MUTATION = gql`
  mutation SalesChannelConnectionCreate(
    $input: SalesChannelConnectionCreateInput!
  ) {
    appsMutation {
      salesChannelConnectionCreate(input: $input) {
        connection { ...SalesChannelConnectionFields }
        operation { id status workflowId }
        duplicate
        userErrors { code message field }
      }
    }
  }
  ${SALES_CHANNEL_CONNECTION_FIELDS}
`;

export const SALES_CHANNEL_CONNECTION_SUSPEND_MUTATION = gql`
  mutation SalesChannelConnectionSuspend($input: SalesChannelConnectionActionInput!) {
    appsMutation {
      result: salesChannelConnectionSuspend(input: $input) {
        connection { ...SalesChannelConnectionFields }
        operation { id status workflowId }
        userErrors { code message field }
      }
    }
  }
  ${SALES_CHANNEL_CONNECTION_FIELDS}
`;

export const SALES_CHANNEL_CONNECTION_RESUME_MUTATION = gql`
  mutation SalesChannelConnectionResume($input: SalesChannelConnectionActionInput!) {
    appsMutation {
      result: salesChannelConnectionResume(input: $input) {
        connection { ...SalesChannelConnectionFields }
        operation { id status workflowId }
        userErrors { code message field }
      }
    }
  }
  ${SALES_CHANNEL_CONNECTION_FIELDS}
`;

export const SALES_CHANNEL_CONNECTION_DISCONNECT_MUTATION = gql`
  mutation SalesChannelConnectionDisconnect($input: SalesChannelConnectionActionInput!) {
    appsMutation {
      result: salesChannelConnectionDisconnect(input: $input) {
        connection { ...SalesChannelConnectionFields }
        operation { id status workflowId }
        userErrors { code message field }
      }
    }
  }
  ${SALES_CHANNEL_CONNECTION_FIELDS}
`;
