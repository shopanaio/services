import { gql } from "@apollo/client";
import { BUNDLE_LIST_ITEM_FIELDS } from "./fragments";

export const BUNDLES_QUERY = gql`
  ${BUNDLE_LIST_ITEM_FIELDS}

  query Bundles(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: BundleWhereInput
    $orderBy: [BundleOrderByInput!]
    $meta: BundleBundlesMetaInput
  ) {
    catalogQuery {
      bundles(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
        meta: $meta
      ) {
        edges {
          cursor
          node {
            ...BundleListItemFields
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
    }
  }
`;
