import { gql } from '@apollo/client';

export type ApiCustomerMutationUpdateResponse = {
  customerMutation: {
    update: boolean;
  };
};

export const UpdateCustomerMutation = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    customerMutation {
      update(input: $input)
    }
  }
`;
