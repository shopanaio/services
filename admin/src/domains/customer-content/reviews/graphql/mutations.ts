import { gql } from "@apollo/client";
import { REVIEW_EDITOR_FRAGMENT } from "./fragments";

export const REVIEW_CREATE_MUTATION = gql`
  mutation ReviewCreate($input: ReviewCreateInput!) {
    reviewsMutation {
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
  mutation ReviewUpdate($reviewId: ID!, $expectedRevision: Int!, $operations: ReviewUpdateInput) {
    reviewsMutation {
      reviewUpdate(
        reviewId: $reviewId
        expectedRevision: $expectedRevision
        operations: $operations
      ) {
        review {
          ...ReviewEditorFields
        }
        operationResults {
          errors {
            code
            field
            message
          }
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
