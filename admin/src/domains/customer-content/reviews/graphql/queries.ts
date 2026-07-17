import { gql } from "@apollo/client";
import { REVIEW_LIST_FRAGMENT } from "./fragments";
import { REVIEW_DETAILS_FRAGMENT } from "./details-fragment";

export const REVIEWS_QUERY = gql`
  query Reviews(
    $first: Int
    $after: String
    $last: Int
    $before: String
    $where: ReviewWhereInput
    $orderBy: [ReviewOrderByInput!]
  ) {
    reviewsQuery {
      reviews(
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
            ...ReviewListFields
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
  ${REVIEW_LIST_FRAGMENT}
`;

export const REVIEW_QUERY = gql`
  query Review($id: ID!) {
    reviewsQuery {
      review(id: $id) {
        ...ReviewDetailsFields
      }
    }
  }
  ${REVIEW_DETAILS_FRAGMENT}
`;

export const REVIEW_EDITOR_CONTEXT_QUERY = gql`
  query ReviewEditorContext {
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

export const PRODUCT_REVIEWS_WIDGET_QUERY = gql`
  query ProductReviewsWidget($productId: ID!) {
    widgetQuery {
      reviews(productId: $productId) {
        reviewSummary {
          reviewCount
          verifiedReviewCount
          mediaReviewCount
          averageRating
          ratingBreakdown {
            rating1Count
            rating2Count
            rating3Count
            rating4Count
            rating5Count
          }
          criteria {
            criterion {
              id
              defaultTitle
            }
            reviewCount
            averageRating
          }
          lastReviewedAt
          updatedAt
        }
        questionSummary {
          questionCount
          answeredQuestionCount
          unansweredQuestionCount
          answerCount
          officialAnswerCount
          lastQuestionAt
          lastAnsweredAt
          updatedAt
        }
      }
    }
  }
`;
