import { gql } from "@apollo/client";

export const TAG_LIST_FRAGMENT = gql`
  fragment TagListFields on Tag {
    id
    name
    handle
    productsCount
    createdAt
  }
`;
