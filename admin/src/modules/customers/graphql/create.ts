import { gql } from '@apollo/client';

export type ApiCustomerMutationCreateResponse = {
  customerMutation: {
    create: string;
  };
};

export const CreateCustomerMutation = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    customerMutation {
      create(input: $input)
    }
  }
`;
