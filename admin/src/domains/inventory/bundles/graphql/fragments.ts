import { gql } from "@apollo/client";

export const BUNDLE_LIST_FILE_FIELDS = gql`
  fragment BundleListFileFields on File {
    id
    url
    altText
    originalName
  }
`;

export const BUNDLE_LIST_ITEM_FIELDS = gql`
  fragment BundleListItemFields on Bundle {
    id
    handle
    title
    type
    isPublished
    media {
      sortIndex
      file {
        url
        altText
        originalName
      }
    }
    primaryCategory {
      id
      name
    }
    priceRange {
      minPriceAmount
      maxPriceAmount
      currency
    }
  }
`;
