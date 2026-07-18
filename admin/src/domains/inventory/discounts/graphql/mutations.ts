import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "../../graphql/shared-fragments";
import { DISCOUNT_LIST_FRAGMENT } from "./fragments";

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
