import { gql } from "@apollo/client";
import {
  INVENTORY_ITEM_FRAGMENT,
  PRODUCT_DETAILS_FRAGMENT,
  PRODUCT_LIST_FRAGMENT,
  VARIANT_FRAGMENT,
} from "./fragments";

export const PRODUCTS_QUERY = gql`
  query Products(
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
      ) {
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

export const VENDORS_QUERY = gql`
  query Vendors(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: VendorWhereInput
    $orderBy: [VendorOrderByInput!]
  ) {
    catalogQuery {
      vendors(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
      ) {
        edges {
          cursor
          node {
            id
            name
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

export const PRODUCT_INVENTORY_WIDGET_QUERY = gql`
  query ProductInventoryWidget($productId: ID!) {
    widgetQuery {
      inventory(productId: $productId) {
        quantities {
          availableForSale
          onHand
          reserved
          unavailable
        }
        availableChange7d
        skuStatus {
          total
          lowStock {
            count
            averageDays
          }
          outOfStock {
            count
            averageDays
          }
          backorder {
            count
            averageDays
          }
        }
        backorder {
          quantity
          etaAvgDays
        }
        alertThreshold {
          method
          minimumStock
        }
      }
    }
  }
`;

export const INVENTORY_DEFAULT_WAREHOUSE_QUERY = gql`
  query InventoryDefaultWarehouse {
    inventoryQuery {
      warehouses(first: 1, where: { isDefault: { _eq: true } }) {
        edges {
          node {
            id
            code
            name
            isDefault
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

export const INVENTORY_ITEM_BY_VARIANT_QUERY = gql`
  query InventoryItemByVariant($variantId: ID!) {
    inventoryQuery {
      inventoryItemByVariant(variantId: $variantId) {
        ...InventoryItemFields
      }
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
`;
