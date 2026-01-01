import { gql } from '@apollo/client';

export const UpdateReviewMutation = gql`
  mutation UpdateReview($input: UpdateReviewInput!) {
    reviewMutation {
      edit(input: $input)
    }
  }
`;
