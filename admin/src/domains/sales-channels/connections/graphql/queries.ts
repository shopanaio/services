import { gql } from "@apollo/client";
import { SALES_CHANNEL_CONNECTION_FIELDS } from "./fragments";

export const SALES_CHANNEL_CONNECTIONS_QUERY = gql`
  query SalesChannelConnections($first: Int, $after: String) {
    appsQuery {
      salesChannelConnections(first: $first, after: $after) {
        edges {
          cursor
          node {
            ...SalesChannelConnectionFields
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
      availableApps {
        code
        displayName
        installed
        installation {
          id
          status
        }
        permissions {
          scope
          granted
        }
        salesChannelSpecifications {
          id
          handle
          label
          definition
        }
      }
    }
  }
  ${SALES_CHANNEL_CONNECTION_FIELDS}
`;
