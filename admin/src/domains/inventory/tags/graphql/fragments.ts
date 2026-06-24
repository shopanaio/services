import { gql } from "@apollo/client";

export const TAG_USER_ERROR_FRAGMENT = gql`
  fragment TagUserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

export const TAG_LIST_FRAGMENT = gql`
  fragment TagListFields on Tag {
    id
    name
    handle
    productsCount
    createdAt
  }
`;

export const TAG_DETAILS_FRAGMENT = gql`
  fragment TagDetailsFields on Tag {
    id
    name
    handle
    productsCount
    createdAt
  }
`;

export const TAG_MUTATION_RESULT_FRAGMENT = gql`
  fragment TagMutationResultFields on Tag {
    id
    name
    handle
    productsCount
    createdAt
  }
`;
