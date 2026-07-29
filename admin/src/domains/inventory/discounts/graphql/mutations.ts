import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "../../graphql/shared-fragments";
import {
  DISCOUNT_DETAILS_FRAGMENT,
  DISCOUNT_LIST_FRAGMENT,
} from "./fragments";

export const DISCOUNT_CREATE_MUTATION = gql`
  mutation DiscountCreate($input: DiscountCreateInput!) {
    pricingMutation {
      discountCreate(input: $input) {
        discount {
          ...DiscountListFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${DISCOUNT_LIST_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const DISCOUNT_UPDATE_MUTATION = gql`
  mutation DiscountUpdate(
    $discountId: ID!
    $expectedRevision: Int!
    $operations: DiscountUpdateInput!
  ) {
    pricingMutation {
      discountUpdate(
        discountId: $discountId
        expectedRevision: $expectedRevision
        operations: $operations
      ) {
        discount {
          ...DiscountDetailsFields
        }
        operationResults {
          type
          applied
          errors {
            ...UserErrorFields
          }
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${DISCOUNT_DETAILS_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
