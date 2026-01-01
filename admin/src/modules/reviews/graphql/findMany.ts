import { gql } from '@apollo/client';
import { ApiCollectionMeta, ApiReview } from '@src/graphql';

export type ApiReviewQueryFindManyResponse = {
  reviewQuery: {
    findMany: {
      meta: ApiCollectionMeta;
      data: ApiReview[];
    };
  };
};

export const ReviewQueryFindMany = gql`
  query FindManyReviews($input: ReviewsInput!) {
    reviewQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...ReviewFragment
        }
      }
    }
  }
`;
