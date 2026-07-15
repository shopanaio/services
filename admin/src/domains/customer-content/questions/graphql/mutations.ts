import { gql } from "@apollo/client";
import { QUESTION_EDITOR_FRAGMENT } from "./fragments";

export const QUESTION_CREATE_MUTATION = gql`
  mutation QuestionCreate($input: ProductQuestionCreateInput!) {
    reviewMutation {
      questionCreate(input: $input) {
        question { ...QuestionEditorFields }
        userErrors { code field message }
      }
    }
  }
  ${QUESTION_EDITOR_FRAGMENT}
`;

export const QUESTION_UPDATE_MUTATION = gql`
  mutation QuestionUpdate($input: ProductQuestionUpdateInput!) {
    reviewMutation {
      questionUpdate(input: $input) {
        question { ...QuestionEditorFields }
        userErrors { code field message }
      }
    }
  }
  ${QUESTION_EDITOR_FRAGMENT}
`;
