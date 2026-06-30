import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "../../graphql/shared-fragments";
import { TAG_MUTATION_RESULT_FRAGMENT } from "./fragments";

export const TAG_CREATE_MUTATION = gql`
  mutation TagCreate($input: TagCreateInput!) {
    catalogMutation {
      tagCreate(input: $input) {
        tag {
          ...TagFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${TAG_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const TAG_UPDATE_MUTATION = gql`
  mutation TagUpdate($input: TagUpdateInput!) {
    catalogMutation {
      tagUpdate(input: $input) {
        tag {
          ...TagFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${TAG_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
