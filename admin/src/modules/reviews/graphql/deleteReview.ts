import { gql } from '@apollo/client';

export const DeleteReviewMutation = gql`
  mutation DeleteReview($input: ID!) {
    reviewMutation {
      delete(input: $input)
    }
  }
`;
