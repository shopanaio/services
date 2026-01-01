import { gql } from '@apollo/client';
import { ApiCustomer } from '@src/graphql';

export type ApiCustomerQueryFindOneResponse = {
  customerQuery: {
    findOne: ApiCustomer;
  };
};

export const FindOneCustomerQuery = gql`
  query FindOneCustomer($id: ID!) {
    customerQuery {
      findOne(id: $id) {
        ...CustomerFragment
      }
    }
  }
`;
