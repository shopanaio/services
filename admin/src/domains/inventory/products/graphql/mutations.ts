import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "../../graphql/shared-fragments";
import { PRODUCT_MUTATION_RESULT_FRAGMENT } from "./fragments";

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
  mutation ProductUpdate($productId: ID!, $operations: ProductUpdateInput) {
    catalogMutation {
      productUpdate(productId: $productId, operations: $operations) {
        product {
          ...ProductMutationResultFields
        }
        operationResults {
          applied
          type
          clientMutationId
          entityId
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

export const PRODUCT_OPTION_CATEGORY_CREATE_MUTATION = gql`
  mutation ProductOptionCategoryCreate($input: ProductOptionCategoryCreateInput!) {
    catalogMutation {
      productOptionCategoryCreate(input: $input) {
        category {
          id
          name
          slug
          createdAt
          updatedAt
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;
