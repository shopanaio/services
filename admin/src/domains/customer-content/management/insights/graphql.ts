import { gql } from "@apollo/client";

export const PRODUCT_QUESTION_SUMMARY_QUERY = gql`
  query ProductQuestionInsights($productId: ID!) {
    reviewsQuery {
      productQuestionSummary(productId: $productId) {
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
`;
