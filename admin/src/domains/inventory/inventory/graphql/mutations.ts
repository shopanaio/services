import { gql } from "@apollo/client";
import { INVENTORY_PRODUCT_BULK_UPDATE_USER_ERROR_FRAGMENT } from "./fragments";

export const INVENTORY_PRODUCT_BULK_UPDATE_MUTATION = gql`
  mutation InventoryProductBulkUpdate($input: ProductBulkUpdateInput!) {
    catalogMutation {
      productBulkUpdate(input: $input) {
        job {
          id
          status
        }
        userErrors {
          ...InventoryProductBulkUpdateUserErrorFields
        }
      }
    }
  }
  ${INVENTORY_PRODUCT_BULK_UPDATE_USER_ERROR_FRAGMENT}
`;
