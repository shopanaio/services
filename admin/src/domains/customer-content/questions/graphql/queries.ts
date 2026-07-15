import { gql } from "@apollo/client";
import { QUESTION_EDITOR_FRAGMENT } from "./fragments";

export const QUESTIONS_QUERY = gql`
  query Questions(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: ProductQuestionWhereInput
    $orderBy: [ProductQuestionOrderByInput!]
  ) {
    reviewQuery {
      questions(first: $first, after: $after, last: $last, before: $before, where: $where, orderBy: $orderBy) {
        edges { cursor node { ...QuestionEditorFields } }
        pageInfo { startCursor endCursor hasPreviousPage hasNextPage }
        totalCount
      }
    }
  }
  ${QUESTION_EDITOR_FRAGMENT}
`;

export const QUESTION_QUERY = gql`
  query Question($id: ID!) {
    reviewQuery { question(id: $id) { ...QuestionEditorFields } }
  }
  ${QUESTION_EDITOR_FRAGMENT}
`;
