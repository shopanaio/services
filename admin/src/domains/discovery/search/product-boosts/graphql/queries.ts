import { gql } from "@apollo/client";
import {
  SEARCH_PRODUCT_BOOST_EDITOR_FRAGMENT,
  SEARCH_PRODUCT_BOOST_LIST_FRAGMENT,
} from "./fragments";
import { SEARCH_SETTINGS_EDITOR_FRAGMENT } from "../../graphql";

export const SEARCH_PRODUCT_BOOSTS_QUERY = gql`
  query SearchProductBoosts(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: SearchProductBoostWhereInput
    $orderBy: [SearchProductBoostOrderByInput!]
    $meta: SearchProductBoostsMetaInput
  ) {
    listingQuery {
      search {
        productBoosts(
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
              ...SearchProductBoostListFields
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
  }
  ${SEARCH_PRODUCT_BOOST_LIST_FRAGMENT}
`;

export const SEARCH_PRODUCT_BOOST_EDITOR_QUERY = gql`
  query SearchProductBoostEditor($id: ID!) {
    listingQuery {
      search {
        settings {
          ...SearchSettingsEditorFields
        }
        productBoost(id: $id) {
          ...SearchProductBoostEditorFields
        }
      }
    }
  }
  ${SEARCH_SETTINGS_EDITOR_FRAGMENT}
  ${SEARCH_PRODUCT_BOOST_EDITOR_FRAGMENT}
`;
