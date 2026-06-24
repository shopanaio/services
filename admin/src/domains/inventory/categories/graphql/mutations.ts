import { gql } from "@apollo/client";
import {
  CATEGORY_DETAILS_FRAGMENT,
  CATEGORY_MUTATION_RESULT_FRAGMENT,
  USER_ERROR_FRAGMENT,
} from "./fragments";

export const CATEGORY_CREATE_MUTATION = gql`
  mutation CategoryCreate($input: CategoryCreateInput!) {
    catalogMutation {
      categoryCreate(input: $input) {
        category {
          ...CategoryMutationResultFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${CATEGORY_MUTATION_RESULT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const CATEGORY_UPDATE_MUTATION = gql`
  mutation CategoryUpdate(
    $categoryId: ID!
    $expectedRevision: Int
    $operations: CategoryUpdateInput
  ) {
    catalogMutation {
      categoryUpdate(
        categoryId: $categoryId
        expectedRevision: $expectedRevision
        operations: $operations
      ) {
        category {
          ...CategoryDetailsFields
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
  ${CATEGORY_DETAILS_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const CATEGORY_DELETE_MUTATION = gql`
  mutation CategoryDelete($input: CategoryDeleteInput!) {
    catalogMutation {
      categoryDelete(input: $input) {
        deletedCategoryId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_CATEGORY_UPDATE_MUTATION = gql`
  mutation ProductCategoryUpdate(
    $productId: ID!
    $categories: [ProductCategoryOperationInput!]!
  ) {
    catalogMutation {
      productUpdate(
        productId: $productId
        operations: { categories: $categories }
      ) {
        product {
          id
          updatedAt
          revision
          primaryCategory {
            id
            productsCount
            updatedAt
          }
          categoryAssignments {
            isPrimary
            category {
              id
              productsCount
              updatedAt
            }
          }
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
  ${USER_ERROR_FRAGMENT}
`;

export const CATEGORY_REBALANCE_MUTATION = gql`
  mutation CategoryRebalance($input: CategoryRebalanceInput!) {
    catalogMutation {
      categoryRebalance(input: $input) {
        category {
          id
          productsCount
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
