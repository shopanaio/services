import { gql } from "@apollo/client";
import {
  TAG_MUTATION_RESULT_FRAGMENT,
  TAG_USER_ERROR_FRAGMENT,
} from "./fragments";

export const TAG_CREATE_MUTATION = gql`
  mutation TagCreate($input: TagCreateInput!) {
    catalogMutation {
      tagCreate(input: $input) {
        tag {
          ...TagMutationResultFields
        }
        userErrors {
          ...TagUserErrorFields
        }
      }
    }
  }
  ${TAG_MUTATION_RESULT_FRAGMENT}
  ${TAG_USER_ERROR_FRAGMENT}
`;

export const TAG_UPDATE_MUTATION = gql`
  mutation TagUpdate($input: TagUpdateInput!) {
    catalogMutation {
      tagUpdate(input: $input) {
        tag {
          ...TagMutationResultFields
        }
        userErrors {
          ...TagUserErrorFields
        }
      }
    }
  }
  ${TAG_MUTATION_RESULT_FRAGMENT}
  ${TAG_USER_ERROR_FRAGMENT}
`;
