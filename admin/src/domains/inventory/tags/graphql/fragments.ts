import { gql } from "@apollo/client";

export const TAG_FRAGMENT = gql`
  fragment TagFields on Tag {
    id
    name
    handle
    productsCount
    createdAt
  }
`;

export const TAG_LIST_FRAGMENT = TAG_FRAGMENT;

export const TAG_DETAILS_FRAGMENT = TAG_FRAGMENT;

export const TAG_MUTATION_RESULT_FRAGMENT = TAG_FRAGMENT;
