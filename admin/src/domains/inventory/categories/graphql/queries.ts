import { gql } from "@apollo/client";
import {
  CATEGORY_DETAILS_FRAGMENT,
  CATEGORY_LIST_FRAGMENT,
  CATEGORY_PRODUCT_LIST_ITEM_FRAGMENT,
} from "./fragments";

export const CATEGORIES_QUERY = gql`
  query Categories(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: CategoryWhereInput
    $orderBy: [CategoryOrderByInput!]
    $meta: CategoryCategoriesMetaInput
  ) {
    catalogQuery {
      categories(
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
            ...CategorySummaryFields
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
  ${CATEGORY_LIST_FRAGMENT}
`;

export const CATEGORY_DETAILS_QUERY = gql`
  query CategoryDetails($id: ID!) {
    catalogQuery {
      category(id: $id) {
        ...CategoryDetailsFields
      }
    }
  }
  ${CATEGORY_DETAILS_FRAGMENT}
`;

export const CATEGORY_PRODUCTS_QUERY = gql`
  query CategoryProducts(
    $categoryId: ID!
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: ProductWhereInput
    $orderBy: [ProductOrderByInput!]
  ) {
    catalogQuery {
      products(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
        meta: { categoriesScope: { referenceIds: [$categoryId], mode: INCLUDE } }
      ) {
        edges {
          cursor
          node {
            ...CategoryProductListItemFields
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
  ${CATEGORY_PRODUCT_LIST_ITEM_FRAGMENT}
`;

export const CATEGORY_LISTING_PREVIEW_QUERY = gql`
  query CategoryListingPreview(
    $categoryId: ID!
    $first: Int
    $after: String
    $query: String
    $locale: LocaleCode
    $currency: CurrencyCode
    $facets: [ListingProductFilter!]
    $orderBy: ListingOrderByInput
  ) {
    listingQuery {
      listing(
        first: $first
        after: $after
        scope: { kind: CATEGORY, categoryId: $categoryId }
        query: $query
        locale: $locale
        currency: $currency
        facets: $facets
        orderBy: $orderBy
      ) {
        edges {
          cursor
          node {
            id
            ... on Product {
              title
              handle
              isPublished
              media {
                sortIndex
                file {
                  id
                  url
                  altText
                }
              }
              priceRange {
                minPriceAmount
                maxPriceAmount
                currency
              }
            }
            ... on Bundle {
              title
              handle
              isPublished
              media {
                sortIndex
                file {
                  id
                  url
                  altText
                }
              }
              priceRange {
                minPriceAmount
                maxPriceAmount
                currency
              }
            }
          }
        }
        facets {
          id
          label
          type
          uiType
          values {
            id
            label
            count
            selected
            input
            swatch {
              id
            }
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
