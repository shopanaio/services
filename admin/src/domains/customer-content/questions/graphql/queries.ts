import { gql } from "@apollo/client";
import { QUESTION_LIST_FRAGMENT } from "./fragments";
import { QUESTION_DETAILS_FRAGMENT } from "./details-fragment";

export const QUESTIONS_QUERY = gql`
  query Questions(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: ProductQuestionWhereInput
    $orderBy: [ProductQuestionOrderByInput!]
  ) {
    reviewsQuery {
      productQuestions(
        first: $first
        after: $after
        last: $last
        before: $before
        where: $where
        orderBy: $orderBy
      ) {
        edges {
          cursor
          node {
            ...QuestionListFields
          }
        }
        pageInfo {
          startCursor
          endCursor
          hasPreviousPage
          hasNextPage
        }
        totalCount
      }
    }
  }
  ${QUESTION_LIST_FRAGMENT}
`;

export const QUESTION_QUERY = gql`
  query Question($id: ID!) {
    reviewsQuery {
      productQuestion(id: $id) {
        ...QuestionDetailsFields
      }
    }
  }
  ${QUESTION_DETAILS_FRAGMENT}
`;

export const QUESTION_EDITOR_CONTEXT_QUERY = gql`
  query QuestionEditorContext {
    catalogQuery {
      products(first: 250) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
    customersQuery {
      customers(first: 250) {
        edges {
          node {
            id
            displayName
            email
            preferredLocale
          }
        }
      }
    }
  }
`;
