import { gql } from "@apollo/client";

export const CUSTOMER_CREATE_MUTATION = gql`
  mutation CustomerCreate($input: CustomerCreateInput!) {
    customersMutation {
      customerCreate(input: $input) {
        customer {
          id
          revision
          displayName
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const CUSTOMER_UPDATE_MUTATION = gql`
  mutation CustomerUpdate($customerId: ID!, $expectedRevision: Int!, $operations: CustomerUpdateInput!) {
    customersMutation {
      customerUpdate(
        customerId: $customerId
        expectedRevision: $expectedRevision
        operations: $operations
      ) {
        customer {
          id
          revision
          displayName
        }
        operationResults {
          type
          applied
          errors {
            code
            field
            message
          }
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const CUSTOMER_DELETE_MUTATION = gql`
  mutation CustomerDelete($input: CustomerDeleteInput!) {
    customersMutation {
      customerDelete(input: $input) {
        deletedCustomerId
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;
