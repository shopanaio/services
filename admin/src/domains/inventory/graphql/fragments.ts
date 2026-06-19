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

// Rich text fragment
export const RICH_TEXT_FRAGMENT = gql`
  fragment RichTextFields on RichText {
    text
    html
    json
  }
`;

// Product option value fragment
export const PRODUCT_OPTION_VALUE_FRAGMENT = gql`
  fragment ProductOptionValueFields on ProductOptionValue {
    id
    name
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
    optionId
    optionValueId
  }
`;

// File fragment for media uploads and product/variant media.
export const FILE_FRAGMENT = gql`
  fragment FileFields on File {
    id
    url
    originalName
    ext
    mimeType
    sizeBytes
    provider
    isProcessed
    altText
    createdAt
    updatedAt
    deletedAt
    deletionState
    dimensions {
      width
      height
    }
    durationMs
    externalData {
      externalId
      providerMeta
    }
    meta
    s3Data {
      bucketId
      etag
      objectKey
      storageClass
    }
    sourceUrl
    usage {
      totalCount
      fileActive
      byEntity {
        entityType
        count
      }
    }
  }
`;

// Variant media item fragment
export const VARIANT_MEDIA_ITEM_FRAGMENT = gql`
  fragment VariantMediaItemFields on VariantMediaItem {
    sortIndex
    file {
      ...FileFields
    }
  }
`;

// Product media item fragment
export const PRODUCT_MEDIA_ITEM_FRAGMENT = gql`
  fragment ProductMediaItemFields on ProductMediaItem {
    sortIndex
    file {
      ...FileFields
    }
  }
`;

// Variant fragment - minimal for lists
export const VARIANT_BASIC_FRAGMENT = gql`
  fragment VariantBasicFields on Variant {
    id
    handle
    title
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
    title
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
    media {
      ...ProductMediaItemFields
    }
  }
  ${PRODUCT_MEDIA_ITEM_FRAGMENT}
  ${FILE_FRAGMENT}
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
    createdAt
    updatedAt
    description {
      ...RichTextFields
    }
    options {
      ...ProductOptionFields
    }
    media {
      ...ProductMediaItemFields
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
  ${RICH_TEXT_FRAGMENT}
  ${PRODUCT_OPTION_FRAGMENT}
  ${PRODUCT_MEDIA_ITEM_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${FILE_FRAGMENT}
`;
