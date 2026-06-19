import { gql } from "@apollo/client";
import {
  PRODUCT_DETAILS_FRAGMENT,
  PRODUCT_LIST_FRAGMENT,
  VARIANT_FRAGMENT,
} from "./fragments";

export const PRODUCTS_QUERY = gql`
  query Products($first: Int, $after: String, $last: Int, $before: String) {
    catalogQuery {
      products(first: $first, after: $after, last: $last, before: $before) {
        edges {
          cursor
          node {
            ...ProductListFields
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
  ${PRODUCT_LIST_FRAGMENT}
`;

export const PRODUCT_DETAILS_QUERY = gql`
  query ProductDetails(
    $id: ID!
    $variantsFirst: Int
    $variantsAfter: String
  ) {
    catalogQuery {
      product(id: $id) {
        ...ProductDetailsFields
      }
    }
  }
  ${PRODUCT_DETAILS_FRAGMENT}
`;

export const PRODUCT_VARIANTS_QUERY = gql`
  query ProductVariants($id: ID!, $first: Int, $after: String) {
    catalogQuery {
      product(id: $id) {
        id
        variants(first: $first, after: $after) {
          edges {
            cursor
            node {
              ...VariantFields
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
  ${VARIANT_FRAGMENT}
`;

export const PRODUCT_PRICING_WIDGET_QUERY = gql`
  query ProductPricingWidget($input: PricingWidgetInput!) {
    widgetQuery {
      pricing(input: $input) {
        currentPrice {
          id
          amountMinor
          compareAtMinor
          currency
          effectiveFrom
          effectiveTo
          isCurrent
          recordedAt
        }
        currentCostPrice {
          id
          unitCostMinor
          currency
          effectiveFrom
          effectiveTo
          isCurrent
          recordedAt
        }
        history {
          edges {
            cursor
            node {
              id
              amountMinor
              compareAtMinor
              currency
              effectiveFrom
              effectiveTo
              isCurrent
              recordedAt
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
        statistics {
          minPriceMinor
          maxPriceMinor
          avgPriceMinor
          currency
        }
      }
    }
  }
`;
