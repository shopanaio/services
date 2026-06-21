import { gql } from "@apollo/client";

export const INVENTORY_VARIANT_FILE_FRAGMENT = gql`
  fragment InventoryVariantFileFields on File {
    id
    url
    originalName
    mimeType
  }
`;

export const INVENTORY_VARIANT_MEDIA_FRAGMENT = gql`
  fragment InventoryVariantMediaFields on VariantMediaItem {
    sortIndex
    file {
      ...InventoryVariantFileFields
    }
  }
  ${INVENTORY_VARIANT_FILE_FRAGMENT}
`;

export const INVENTORY_VARIANT_STOCK_FRAGMENT = gql`
  fragment InventoryVariantStockFields on WarehouseStock {
    id
    warehouseId
    variantId
    quantityOnHand
    reservedQuantity
    unavailableQuantity
    availableForSale
    createdAt
    updatedAt
  }
`;

export const INVENTORY_VARIANT_ITEM_FRAGMENT = gql`
  fragment InventoryVariantItemFields on InventoryItem {
    id
    variantId
    sku
    trackInventory
    continueSellingWhenOutOfStock
    totalAvailable
    stock {
      ...InventoryVariantStockFields
    }
  }
  ${INVENTORY_VARIANT_STOCK_FRAGMENT}
`;

export const INVENTORY_VARIANT_ROW_FRAGMENT = gql`
  fragment InventoryVariantRowFields on Variant {
    id
    title
    handle
    isDefault
    product {
      id
      title
      handle
    }
    selectedOptions {
      optionId
      optionValueId
    }
    media {
      ...InventoryVariantMediaFields
    }
    inventoryItem {
      ...InventoryVariantItemFields
    }
  }
  ${INVENTORY_VARIANT_MEDIA_FRAGMENT}
  ${INVENTORY_VARIANT_ITEM_FRAGMENT}
`;

export const INVENTORY_PRODUCT_BULK_UPDATE_USER_ERROR_FRAGMENT = gql`
  fragment InventoryProductBulkUpdateUserErrorFields on BulkUpdateUserError {
    message
    code
    field
  }
`;
