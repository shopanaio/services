import { gql } from "@apollo/client";

export const SEARCH_PRODUCT_BOOST_LIST_FRAGMENT = gql`
  fragment SearchProductBoostListFields on SearchProductBoost {
    id
    locale
    name
    enabled
    version
    phrases {
      phrase
      position
    }
    phrasesCount
    productIds
    productsCount
    createdAt
    updatedAt
  }
`;
