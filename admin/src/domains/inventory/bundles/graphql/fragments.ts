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
    title
    type
    isPublished
    media {
      sortIndex
      file {
        ...BundleListFileFields
      }
    }
  }
  ${BUNDLE_LIST_FILE_FIELDS}
`;
