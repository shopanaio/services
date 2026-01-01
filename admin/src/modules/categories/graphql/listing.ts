import { gql } from '@apollo/client';
import { ApiListingQuery } from '@src/graphql';

export type ApiListingQueryResponse = {
  listingQuery: ApiListingQuery;
};

export const ListingQuery = gql`
  query Listing($input: ListingInput!) {
    listingQuery {
      listingV1(input: $input) {
        data {
          ...ListingProductFragment

          # listingSortIndex
        }
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
      }
    }
  }
`;
