import { gql } from "@apollo/client";
import {
  CATEGORY_MUTATION_RESULT_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from "./fragments";

export const CATEGORY_CREATE_MUTATION = gql`
  mutation CategoryCreate($input: CategoryCreateInput!) {
    catalogMutation {
      categoryCreate(input: $input) {
        category {
          ...CategoryMutationResultFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${CATEGORY_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
