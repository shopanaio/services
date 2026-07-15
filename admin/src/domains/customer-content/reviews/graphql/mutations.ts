import { gql } from "@apollo/client";
import { REVIEW_EDITOR_FRAGMENT } from "./fragments";

export const REVIEW_CREATE_MUTATION = gql`
  mutation ReviewCreate($input: ReviewCreateInput!) {
    reviewMutation {
      reviewCreate(input: $input) {
        review {
          ...ReviewEditorFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${REVIEW_EDITOR_FRAGMENT}
`;

export const REVIEW_UPDATE_MUTATION = gql`
  mutation ReviewUpdate($input: ReviewUpdateInput!) {
    reviewMutation {
      reviewUpdate(input: $input) {
        review {
          ...ReviewEditorFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${REVIEW_EDITOR_FRAGMENT}
`;
