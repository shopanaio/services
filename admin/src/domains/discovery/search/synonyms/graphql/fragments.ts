import { gql } from "@apollo/client";

export const SEARCH_SYNONYM_GROUP_LIST_FRAGMENT = gql`
  fragment SearchSynonymGroupListFields on SearchSynonymGroup {
    id
    locale
    name
    enabled
    version
    values {
      value
      position
    }
    valuesCount
    createdAt
    updatedAt
  }
`;
