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
    products {
      id
    }
    productsCount
    createdAt
    updatedAt
  }
`;

export const SEARCH_PRODUCT_BOOST_EDITOR_FRAGMENT = gql`
  fragment SearchProductBoostEditorFields on SearchProductBoost {
    id
    locale
    name
    enabled
    version
    phrases {
      phrase
      position
    }
    products {
      id
      title
      isPublished
      media {
        sortIndex
        file {
          url
          originalName
          altText
        }
      }
    }
    productsCount
    createdAt
    updatedAt
  }
`;
