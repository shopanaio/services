import { gql } from "@apollo/client";

/**
 * GraphQL fragments for inventory domain entities.
 */

// Generic user error fragment (reused from workspace)
export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

// Product description fragment
export const DESCRIPTION_FRAGMENT = gql`
  fragment DescriptionFields on Description {
    text
    html
    json
  }
`;

// Product option value fragment
export const PRODUCT_OPTION_VALUE_FRAGMENT = gql`
  fragment ProductOptionValueFields on ProductOptionValue {
    id
    value
    slug
  }
`;

// Product option fragment
export const PRODUCT_OPTION_FRAGMENT = gql`
  fragment ProductOptionFields on ProductOption {
    id
    name
    slug
    displayType
    values {
      ...ProductOptionValueFields
    }
  }
  ${PRODUCT_OPTION_VALUE_FRAGMENT}
`;

// Selected option fragment (for variants)
export const SELECTED_OPTION_FRAGMENT = gql`
  fragment SelectedOptionFields on SelectedOption {
    name
    value
  }
`;

// Variant media item fragment
export const VARIANT_MEDIA_ITEM_FRAGMENT = gql`
  fragment VariantMediaItemFields on VariantMediaItem {
    id
    position
    file {
      id
      url
      name
      size
      mimeType
      altText
    }
  }
`;

// Variant fragment - minimal for lists
export const VARIANT_BASIC_FRAGMENT = gql`
  fragment VariantBasicFields on Variant {
    id
    handle
    sku
    isDefault
    selectedOptions {
      ...SelectedOptionFields
    }
  }
  ${SELECTED_OPTION_FRAGMENT}
`;

// Variant fragment - full
export const VARIANT_FRAGMENT = gql`
  fragment VariantFields on Variant {
    id
    handle
    sku
    isDefault
    selectedOptions {
      ...SelectedOptionFields
    }
    media {
      ...VariantMediaItemFields
    }
  }
  ${SELECTED_OPTION_FRAGMENT}
  ${VARIANT_MEDIA_ITEM_FRAGMENT}
`;

// Product fragment - minimal for lists
export const PRODUCT_BASIC_FRAGMENT = gql`
  fragment ProductBasicFields on Product {
    id
    title
    handle
    isPublished
    publishedAt
    createdAt
    updatedAt
  }
`;

// Product fragment - full with variants and options
export const PRODUCT_FRAGMENT = gql`
  fragment ProductFields on Product {
    id
    title
    handle
    isPublished
    publishedAt
    excerpt {
      ...DescriptionFields
    }
    seoTitle
    seoDescription
    createdAt
    updatedAt
    description {
      ...DescriptionFields
    }
    options {
      ...ProductOptionFields
    }
    variants(first: 100) {
      edges {
        node {
          ...VariantFields
        }
      }
      totalCount
    }
    variantsCount
  }
  ${DESCRIPTION_FRAGMENT}
  ${PRODUCT_OPTION_FRAGMENT}
  ${VARIANT_FRAGMENT}
`;

// File fragment for media uploads
export const FILE_FRAGMENT = gql`
  fragment FileFields on File {
    id
    url
    name
    size
    mimeType
    altText
  }
`;
