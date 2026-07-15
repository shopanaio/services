import { gql } from "@apollo/client";
import { CUSTOMER_DETAILS_FRAGMENT } from "./fragments";

export const CUSTOMER_CREATE_MUTATION = gql`
  mutation CustomerCreate($input: CustomerCreateInput!) {
    customersMutation {
      customerCreate(input: $input) {
        customer {
          ...CustomerDetailsFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${CUSTOMER_DETAILS_FRAGMENT}
`;

export const CUSTOMER_UPDATE_MUTATION = gql`
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customersMutation {
      customerUpdate(input: $input) {
        customer {
          ...CustomerDetailsFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${CUSTOMER_DETAILS_FRAGMENT}
`;
