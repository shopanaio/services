import { gql } from '@apollo/client';

export const CreateReviewMutation = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    reviewMutation {
      create(input: $input)
    }
  }
`;
