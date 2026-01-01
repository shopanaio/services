import { gql } from '@apollo/client';
import {
  ApiCustomer,
  ApiCustomerQueryFindManyArgs,
  ApiCollectionMeta,
} from '@src/graphql';

export type ApiCustomerQueryOptionsArgs = ApiCustomerQueryFindManyArgs & {
  withCover?: boolean;
};

export type ApiCustomerQueryOptionsResponse = {
  customerQuery: {
    findMany: {
      data: ApiCustomer[];
      meta: ApiCollectionMeta;
    };
  };
};

export const CustomerQueryOptions = gql`
  query CustomerOptions($input: CustomersInput!) {
    customerQuery {
      findMany(input: $input) {
        data {
          ...CustomerFragment
        }
        meta {
          page
          pageSize
          total
          count
          pageCount
        }
      }
    }
  }
`;
