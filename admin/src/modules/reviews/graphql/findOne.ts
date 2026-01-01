import { gql } from '@apollo/client';

export const ReviewQueryFindOne = gql`
  query FindOneReview($id: ID!) {
    reviewQuery {
      findOne(id: $id) {
        ...ReviewFragment
      }
    }
  }
`;
