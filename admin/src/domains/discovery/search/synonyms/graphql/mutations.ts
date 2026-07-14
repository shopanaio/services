import { gql } from "@apollo/client";
import { SEARCH_SYNONYM_GROUP_EDITOR_FRAGMENT } from "./fragments";

export const SEARCH_SYNONYM_GROUP_CREATE_MUTATION = gql`
  mutation SearchSynonymGroupCreate($input: SearchSynonymGroupCreateInput!) {
    listingMutation {
      search {
        synonymGroupCreate(input: $input) {
          synonymGroup {
            ...SearchSynonymGroupEditorFields
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    }
  }
  ${SEARCH_SYNONYM_GROUP_EDITOR_FRAGMENT}
`;

export const SEARCH_SYNONYM_GROUP_UPDATE_MUTATION = gql`
  mutation SearchSynonymGroupUpdate($input: SearchSynonymGroupUpdateInput!) {
    listingMutation {
      search {
        synonymGroupUpdate(input: $input) {
          synonymGroup {
            ...SearchSynonymGroupEditorFields
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    }
  }
  ${SEARCH_SYNONYM_GROUP_EDITOR_FRAGMENT}
`;
