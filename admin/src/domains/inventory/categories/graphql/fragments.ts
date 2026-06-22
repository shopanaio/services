import { gql } from "@apollo/client";

export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

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

export const CATEGORY_MUTATION_RESULT_FRAGMENT = gql`
  fragment CategoryMutationResultFields on Category {
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
