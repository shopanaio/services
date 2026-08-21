import { gql } from "@apollo/client";

export const REVIEW_DELETE_MUTATION = gql`
  mutation AdminReviewDelete($input: ReviewContentDeleteInput!) {
    reviewsMutation {
      reviewDelete(input: $input) {
        deletedReviewId
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const QUESTION_DELETE_MUTATION = gql`
  mutation AdminQuestionDelete($input: ReviewContentDeleteInput!) {
    reviewsMutation {
      productQuestionDelete(input: $input) {
        deletedProductQuestionId
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const CONTENT_REDACT_MUTATION = gql`
  mutation AdminContentRedact($contentId: ID!) {
    reviewsMutation {
      contentRedact(contentId: $contentId) {
        content {
          id
          revision
          redactedAt
          updatedAt
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
`;
