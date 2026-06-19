/**
 * Inventory domain GraphQL operations.
 * Exports all fragments and mutations for the Inventory and Media services.
 */

// Re-export all fragments
export {
  // Error
  USER_ERROR_FRAGMENT,
  // Rich text
  RICH_TEXT_FRAGMENT,
  // Option
  PRODUCT_OPTION_VALUE_FRAGMENT,
  PRODUCT_OPTION_FRAGMENT,
  // Variant
  SELECTED_OPTION_FRAGMENT,
  VARIANT_MEDIA_ITEM_FRAGMENT,
  VARIANT_BASIC_FRAGMENT,
  VARIANT_FRAGMENT,
  // Product
  PRODUCT_MEDIA_ITEM_FRAGMENT,
  PRODUCT_BASIC_FRAGMENT,
  PRODUCT_FRAGMENT,
  // File
  FILE_FRAGMENT,
} from "./fragments";

// Re-export all mutations
export {
  // Product
  PRODUCT_CREATE_MUTATION,
  PRODUCT_UPDATE_MUTATION,
  PRODUCT_DELETE_MUTATION,
  PRODUCT_PUBLISH_MUTATION,
  // Product Option
  PRODUCT_OPTION_CREATE_MUTATION,
  // Variant
  VARIANT_SET_MEDIA_MUTATION,
  // Media
  FILE_UPLOAD_MUTATION,
} from "./mutations";
