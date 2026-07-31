import { gql } from "@apollo/client";
import { USER_ERROR_FRAGMENT } from "../../graphql/shared-fragments";
import {
  PRODUCT_COMPONENT_FRAGMENT,
  PRODUCT_MUTATION_RESULT_FRAGMENT,
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

export const PRODUCT_COMPONENT_CONFIGURATION_CREATE_MUTATION = gql`
  mutation ProductComponentConfigurationCreate(
    $input: ProductComponentConfigurationCreateInput!
  ) {
    catalogMutation {
      productComponentConfigurationCreate(input: $input) {
        configuration {
          id
          name
        }
        productComponent {
          ...ProductComponentFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_COMPONENT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_COMPONENT_CONFIGURATION_UPDATE_MUTATION = gql`
  mutation ProductComponentConfigurationUpdate(
    $input: ProductComponentConfigurationUpdateInput!
  ) {
    catalogMutation {
      productComponentConfigurationUpdate(input: $input) {
        configuration {
          id
          name
        }
        productComponent {
          ...ProductComponentFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_COMPONENT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_COMPONENT_CONFIGURATION_DELETE_MUTATION = gql`
  mutation ProductComponentConfigurationDelete(
    $input: ProductComponentConfigurationDeleteInput!
  ) {
    catalogMutation {
      productComponentConfigurationDelete(input: $input) {
        deletedConfigurationId
        product {
          id
          revision
        }
        productComponent {
          ...ProductComponentFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_COMPONENT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC_MUTATION = gql`
  mutation ProductComponentDependencyRulesSync(
    $input: ProductComponentDependencyRulesSyncInput!
  ) {
    catalogMutation {
      productComponentDependencyRulesSync(input: $input) {
        productComponent {
          ...ProductComponentFields
        }
        dependencyRules {
          id
          name
          enabled
          priority
          logicOperator
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_COMPONENT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
