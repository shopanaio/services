import { gql } from '@apollo/client';
import { ApiCustomer, ApiCollectionMeta } from '@src/graphql';

export type ApiCustomerQueryFindManyResponse = {
  customerQuery: {
    findMany: {
      meta: ApiCollectionMeta;
      data: ApiCustomer[];
    };
  };
};

export const CustomerQueryFindMany = gql`
  query FindManyCustomers($input: CustomersInput!) {
    customerQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...CustomerFragment
        }
      }
    }
  }
`;
