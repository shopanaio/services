import { gql } from "@apollo/client";
import {
  FILE_FRAGMENT,
  INVENTORY_ITEM_FRAGMENT,
  PRODUCT_MUTATION_RESULT_FRAGMENT,
  PRODUCT_OPTION_FRAGMENT,
  USER_ERROR_FRAGMENT,
  VARIANT_FRAGMENT,
} from "./fragments";

export const PRODUCT_CREATE_MUTATION = gql`
  mutation ProductCreate($input: ProductCreateInput!) {
    catalogMutation {
      productCreate(input: $input) {
        product {
          ...ProductMutationResultFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_UPDATE_MUTATION = gql`
  mutation ProductUpdate(
    $productId: ID!
    $operations: ProductUpdateInput
    $expectedRevision: Int
  ) {
    catalogMutation {
      productUpdate(
        productId: $productId
        operations: $operations
        expectedRevision: $expectedRevision
      ) {
        product {
          ...ProductMutationResultFields
        }
        operationResults {
          applied
          type
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
  ${PRODUCT_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_DELETE_MUTATION = gql`
  mutation ProductDelete($input: ProductDeleteInput!) {
    catalogMutation {
      productDelete(input: $input) {
        deletedProductId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_UPDATE_STATUS_MUTATION = gql`
  mutation ProductUpdateStatus($input: ProductUpdateStatusInput!) {
    catalogMutation {
      productUpdateStatus(input: $input) {
        product {
          ...ProductMutationResultFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_PUBLISH_MUTATION = PRODUCT_UPDATE_STATUS_MUTATION;

export const PRODUCT_OPTION_CREATE_MUTATION = gql`
  mutation ProductOptionCreate($input: ProductOptionCreateInput!) {
    catalogMutation {
      productOptionCreate(input: $input) {
        product {
          ...ProductMutationResultFields
        }
        option {
          ...ProductOptionFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_MUTATION_RESULT_FRAGMENT}
  ${PRODUCT_OPTION_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const VARIANT_SET_MEDIA_MUTATION = gql`
  mutation VariantSetMedia($input: VariantUpdateMediaInput!) {
    catalogMutation {
      variantUpdateMedia(input: $input) {
        variant {
          ...VariantFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${VARIANT_FRAGMENT}
  ${FILE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const INVENTORY_ITEM_UPDATE_MUTATION = gql`
  mutation InventoryItemUpdate($input: InventoryItemUpdateInput!) {
    inventoryMutation {
      inventoryItemUpdate(input: $input) {
        inventoryItem {
          ...InventoryItemFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${INVENTORY_ITEM_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
