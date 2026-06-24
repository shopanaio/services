import { gql } from "@apollo/client";
import {
  FILE_FRAGMENT,
  RICH_TEXT_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from "../../graphql/shared-fragments";

export {
  FILE_FRAGMENT,
  RICH_TEXT_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from "../../graphql/shared-fragments";

export const PRODUCT_MEDIA_ITEM_FRAGMENT = gql`
  fragment ProductMediaItemFields on ProductMediaItem {
    sortIndex
    file {
      ...FileFields
    }
  }
  ${FILE_FRAGMENT}
`;

export const VARIANT_MEDIA_ITEM_FRAGMENT = gql`
  fragment VariantMediaItemFields on VariantMediaItem {
    sortIndex
    file {
      ...FileFields
    }
  }
  ${FILE_FRAGMENT}
`;

export const SELECTED_OPTION_FRAGMENT = gql`
  fragment SelectedOptionFields on SelectedOption {
    optionId
    optionValueId
  }
`;

export const INVENTORY_ITEM_FRAGMENT = gql`
  fragment InventoryItemFields on InventoryItem {
    id
    variantId
    sku
    trackInventory
    continueSellingWhenOutOfStock
    totalAvailable
    createdAt
    updatedAt
    stock {
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
    weight {
      weightGrams
      displayUnit
    }
    dimensions {
      lengthMm
      widthMm
      heightMm
      displayUnit
    }
    unitCost {
      amountMinor
      currency
      effectiveFrom
    }
  }
`;

export const VARIANT_FRAGMENT = gql`
  fragment VariantFields on Variant {
    id
    handle
    title
    isDefault
    createdAt
    updatedAt
    deletedAt
    externalId
    externalSystem
    selectedOptions {
      ...SelectedOptionFields
    }
    media {
      ...VariantMediaItemFields
    }
    price {
      id
      amountMinor
      compareAtMinor
      currency
      effectiveFrom
      effectiveTo
      isCurrent
      recordedAt
    }
    inventoryItem {
      ...InventoryItemFields
    }
  }
  ${SELECTED_OPTION_FRAGMENT}
  ${VARIANT_MEDIA_ITEM_FRAGMENT}
  ${INVENTORY_ITEM_FRAGMENT}
`;

export const PRODUCT_OPTION_VALUE_FRAGMENT = gql`
  fragment ProductOptionValueFields on ProductOptionValue {
    id
    name
    slug
    sortIndex
    swatch {
      id
      swatchType
      colorOne
      colorTwo
      metadata
      file {
        ...FileFields
      }
    }
  }
  ${FILE_FRAGMENT}
`;

export const PRODUCT_OPTION_FRAGMENT = gql`
  fragment ProductOptionFields on ProductOption {
    id
    name
    slug
    displayType
    sortIndex
    values {
      ...ProductOptionValueFields
    }
  }
  ${PRODUCT_OPTION_VALUE_FRAGMENT}
`;

export const PRODUCT_CATEGORY_FRAGMENT = gql`
  fragment ProductCategoryFields on Category {
    id
    name
    handle
    isPublished
    productsCount
    media {
      sortIndex
      file {
        ...FileFields
      }
    }
  }
  ${FILE_FRAGMENT}
`;

export const PRODUCT_TAG_FRAGMENT = gql`
  fragment ProductTagFields on Tag {
    id
    name
    handle
    productsCount
  }
`;

export const VENDOR_FRAGMENT = gql`
  fragment VendorFields on Vendor {
    id
    name
  }
`;

export const PRODUCT_FEATURE_FRAGMENT = gql`
  fragment ProductFeatureFields on ProductFeature {
    id
    name
    slug
    isGroup
    index
    values {
      id
      name
      slug
      index
    }
  }
`;

export const PRODUCT_LIST_FRAGMENT = gql`
  fragment ProductListFields on Product {
    id
    title
    handle
    isPublished
    publishedAt
    createdAt
    updatedAt
    deletedAt
    revision
    media {
      ...ProductMediaItemFields
    }
    primaryCategory {
      ...ProductCategoryFields
    }
    categoryAssignments {
      isPrimary
      category {
        ...ProductCategoryFields
      }
    }
    vendor {
      ...VendorFields
    }
    variants(first: 100) {
      edges {
        node {
          id
          price {
            id
            amountMinor
            compareAtMinor
            currency
            effectiveFrom
            effectiveTo
            isCurrent
            recordedAt
          }
          inventoryItem {
            ...InventoryItemFields
          }
        }
      }
    }
  }
  ${PRODUCT_MEDIA_ITEM_FRAGMENT}
  ${PRODUCT_CATEGORY_FRAGMENT}
  ${INVENTORY_ITEM_FRAGMENT}
  ${VENDOR_FRAGMENT}
`;

export const PRODUCT_EDITOR_BASE_FRAGMENT = gql`
  fragment ProductEditorBaseFields on Product {
    id
    title
    handle
    isPublished
    publishedAt
    createdAt
    updatedAt
    deletedAt
    revision
    variantsCount
    description {
      ...RichTextFields
    }
    excerpt {
      ...RichTextFields
    }
    seo {
      seoTitle
      seoDescription
      ogTitle
      ogDescription
      ogImage {
        ...FileFields
      }
    }
    media {
      ...ProductMediaItemFields
    }
    primaryCategory {
      ...ProductCategoryFields
    }
    categoryAssignments {
      isPrimary
      category {
        ...ProductCategoryFields
      }
    }
    tags {
      ...ProductTagFields
    }
    features {
      ...ProductFeatureFields
    }
    options {
      ...ProductOptionFields
    }
  }
  ${RICH_TEXT_FRAGMENT}
  ${FILE_FRAGMENT}
  ${PRODUCT_MEDIA_ITEM_FRAGMENT}
  ${PRODUCT_CATEGORY_FRAGMENT}
  ${PRODUCT_TAG_FRAGMENT}
  ${PRODUCT_FEATURE_FRAGMENT}
  ${PRODUCT_OPTION_FRAGMENT}
`;

export const PRODUCT_DETAILS_FRAGMENT = gql`
  fragment ProductDetailsFields on Product {
    ...ProductEditorBaseFields
    variants(first: $variantsFirst, after: $variantsAfter) {
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
  ${PRODUCT_EDITOR_BASE_FRAGMENT}
  ${VARIANT_FRAGMENT}
`;

export const PRODUCT_MUTATION_RESULT_FRAGMENT = gql`
  fragment ProductMutationResultFields on Product {
    ...ProductEditorBaseFields
    variants(first: 100) {
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
  ${PRODUCT_EDITOR_BASE_FRAGMENT}
  ${VARIANT_FRAGMENT}
`;

export const VARIANT_BASIC_FRAGMENT = VARIANT_FRAGMENT;
export const PRODUCT_BASIC_FRAGMENT = PRODUCT_LIST_FRAGMENT;
export const PRODUCT_FRAGMENT = PRODUCT_MUTATION_RESULT_FRAGMENT;
