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
    weight {
      value
    }
    dimensions {
      length
      width
      height
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

export const PRODUCT_COMPONENT_PRICE_RULE_FRAGMENT = gql`
  fragment ProductComponentPriceRuleFields on ProductComponentPriceRule {
    id
    strategy
    ... on ProductComponentAdjustmentPriceRule {
      operation
      valueType
      percentageBps
      amounts {
        currency
        amountMinor
      }
    }
    ... on ProductComponentOverridePriceRule {
      amounts {
        currency
        amountMinor
      }
    }
  }
`;

export const PRODUCT_COMPONENT_FRAGMENT = gql`
  fragment ProductComponentFields on ProductComponent {
    id
    productId
    displayStyle
    createdAt
    updatedAt
    configurations {
      id
      productId
      name
      createdAt
      updatedAt
      variants {
        id
        title
      }
      groups {
        id
        title
        sortIndex
        minSelection
        maxSelection
        createdAt
        updatedAt
        items {
          id
          groupId
          itemType
          sortIndex
          title
          visible
          selected
          minQty
          maxQty
          defaultQty
          refProductId
          refVariantId
          featuredImage {
            ...FileFields
          }
          refProduct {
            id
            title
            media {
              ...ProductMediaItemFields
            }
          }
          refVariant {
            id
            title
            media {
              ...VariantMediaItemFields
            }
            product {
              id
              title
            }
          }
          priceRule {
            ...ProductComponentPriceRuleFields
          }
          pricingTemplate {
            id
            name
            sortIndex
            priceRule {
              ...ProductComponentPriceRuleFields
            }
          }
          optionSelections {
            id
            optionId
            parentOptionId
            sortIndex
            values {
              id
              optionValueId
              value
              status
              sortIndex
            }
          }
        }
      }
      pricingTemplates {
        id
        name
        sortIndex
        priceRule {
          ...ProductComponentPriceRuleFields
        }
      }
      dependencyRules {
        id
        name
        enabled
        priority
        logicOperator
        createdAt
        updatedAt
        conditionGroups {
          id
          logicOperator
          sortIndex
          conditions {
            id
            category
            subject
            operator
            targetType
            targetId
            value
            sortIndex
          }
        }
        actions {
          id
          actionType
          targetType
          targetId
          requiredValue
          stackable
          sortIndex
          priceRule {
            ...ProductComponentPriceRuleFields
          }
        }
      }
    }
  }
  ${FILE_FRAGMENT}
  ${PRODUCT_MEDIA_ITEM_FRAGMENT}
  ${VARIANT_MEDIA_ITEM_FRAGMENT}
  ${PRODUCT_COMPONENT_PRICE_RULE_FRAGMENT}
`;

export const PRODUCT_LIST_FRAGMENT = gql`
  fragment ProductListFields on Product {
    id
    title
    handle
    isPublished
    media {
      sortIndex
      file {
        url
        originalName
        altText
      }
    }
    primaryCategory {
      id
      name
    }
    vendor {
      ...VendorFields
    }
    priceRange {
      minPriceAmount
      maxPriceAmount
      currency
    }
    variants(first: 100) {
      edges {
        node {
          id
          inventoryItem {
            totalAvailable
          }
        }
      }
    }
  }
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
    productComponent {
      ...ProductComponentFields
    }
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
  ${PRODUCT_COMPONENT_FRAGMENT}
  ${VARIANT_FRAGMENT}
`;

export const PRODUCT_MUTATION_RESULT_FRAGMENT = gql`
  fragment ProductMutationResultFields on Product {
    ...ProductEditorBaseFields
    productComponent {
      ...ProductComponentFields
    }
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
  ${PRODUCT_COMPONENT_FRAGMENT}
  ${VARIANT_FRAGMENT}
`;

export const VARIANT_BASIC_FRAGMENT = VARIANT_FRAGMENT;
export const PRODUCT_BASIC_FRAGMENT = PRODUCT_LIST_FRAGMENT;
export const PRODUCT_FRAGMENT = PRODUCT_MUTATION_RESULT_FRAGMENT;
