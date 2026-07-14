import { gql } from "@apollo/client";
import { SEARCH_PRODUCT_BOOST_EDITOR_FRAGMENT } from "./fragments";

export const SEARCH_PRODUCT_BOOST_CREATE_MUTATION = gql`
  mutation SearchProductBoostCreate($input: SearchProductBoostCreateInput!) {
    listingMutation {
      search {
        productBoostCreate(input: $input) {
          productBoost {
            ...SearchProductBoostEditorFields
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    }
  }
  ${SEARCH_PRODUCT_BOOST_EDITOR_FRAGMENT}
`;

export const SEARCH_PRODUCT_BOOST_UPDATE_MUTATION = gql`
  mutation SearchProductBoostUpdate($input: SearchProductBoostUpdateInput!) {
    listingMutation {
      search {
        productBoostUpdate(input: $input) {
          productBoost {
            ...SearchProductBoostEditorFields
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    }
  }
  ${SEARCH_PRODUCT_BOOST_EDITOR_FRAGMENT}
`;
