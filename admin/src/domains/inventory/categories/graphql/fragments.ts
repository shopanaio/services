import { gql } from "@apollo/client";

export const CATEGORY_LIST_FRAGMENT = gql`
  fragment CategoryListFields on Category {
    id
    name
    handle
    isPublished
    publishedAt
    productsCount
    depth
    path
    createdAt
    updatedAt
    media {
      sortIndex
      file {
        id
        url
        originalName
        mimeType
        altText
      }
    }
    parent {
      id
      name
      handle
    }
  }
`;
