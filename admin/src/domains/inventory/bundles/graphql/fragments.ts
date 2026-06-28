import { gql } from "@apollo/client";
import {
  FILE_FRAGMENT,
  RICH_TEXT_FRAGMENT,
} from "@/domains/inventory/graphql/shared-fragments";

export const BUNDLE_LIST_MEDIA_ITEM_FIELDS = gql`
  fragment BundleListMediaItemFields on ProductMediaItem {
    sortIndex
    file {
      ...FileFields
    }
  }
  ${FILE_FRAGMENT}
`;

export const BUNDLE_LIST_CATEGORY_FIELDS = gql`
  fragment BundleListCategoryFields on Category {
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

export const BUNDLE_LIST_TAG_FIELDS = gql`
  fragment BundleListTagFields on Tag {
    id
    name
    handle
    productsCount
  }
`;

export const BUNDLE_LIST_VENDOR_FIELDS = gql`
  fragment BundleListVendorFields on Vendor {
    id
    name
  }
`;

export const BUNDLE_LIST_FEATURE_FIELDS = gql`
  fragment BundleListFeatureFields on ProductFeature {
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

export const BUNDLE_LIST_OPTION_VALUE_FIELDS = gql`
  fragment BundleListOptionValueFields on ProductOptionValue {
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

export const BUNDLE_LIST_OPTION_FIELDS = gql`
  fragment BundleListOptionFields on ProductOption {
    id
    name
    slug
    displayType
    sortIndex
    values {
      ...BundleListOptionValueFields
    }
  }
  ${BUNDLE_LIST_OPTION_VALUE_FIELDS}
`;

export const BUNDLE_LIST_ITEM_FIELDS = gql`
  fragment BundleListItemFields on Bundle {
    id
    title
    handle
    type
    isPublished
    publishedAt
    createdAt
    updatedAt
    revision
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
      ...BundleListMediaItemFields
    }
    primaryCategory {
      ...BundleListCategoryFields
    }
    categoryAssignments {
      isPrimary
      category {
        ...BundleListCategoryFields
      }
    }
    vendor {
      ...BundleListVendorFields
    }
    tags {
      ...BundleListTagFields
    }
    features {
      ...BundleListFeatureFields
    }
    options {
      ...BundleListOptionFields
    }
  }
  ${RICH_TEXT_FRAGMENT}
  ${FILE_FRAGMENT}
  ${BUNDLE_LIST_MEDIA_ITEM_FIELDS}
  ${BUNDLE_LIST_CATEGORY_FIELDS}
  ${BUNDLE_LIST_VENDOR_FIELDS}
  ${BUNDLE_LIST_TAG_FIELDS}
  ${BUNDLE_LIST_FEATURE_FIELDS}
  ${BUNDLE_LIST_OPTION_FIELDS}
`;
