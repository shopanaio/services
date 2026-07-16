import { gql } from "@apollo/client";
import { QUESTION_EDITOR_FRAGMENT } from "./fragments";

export const QUESTION_CREATE_MUTATION = gql`
  mutation QuestionCreate($input: ProductQuestionCreateInput!) {
    reviewsMutation {
      productQuestionCreate(input: $input) {
        productQuestion {
          ...QuestionEditorFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${QUESTION_EDITOR_FRAGMENT}
`;

export const QUESTION_UPDATE_MUTATION = gql`
  mutation QuestionUpdate(
    $productQuestionId: ID!
    $expectedRevision: Int!
    $operations: ProductQuestionUpdateInput
  ) {
    reviewsMutation {
      productQuestionUpdate(
        productQuestionId: $productQuestionId
        expectedRevision: $expectedRevision
        operations: $operations
      ) {
        productQuestion {
          ...QuestionEditorFields
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
  ${QUESTION_EDITOR_FRAGMENT}
`;
