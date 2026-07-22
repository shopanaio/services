import { gql } from "@apollo/client";
import { GENERAL_SETTINGS_STORE_FRAGMENT } from "./fragments";

export const UPDATE_GENERAL_SETTINGS_MUTATION = gql`
  mutation UpdateGeneralSettings(
    $storeId: ID!
    $clientMutationId: String!
    $expectedRevision: Int!
    $operations: StoreUpdateInput
  ) {
    storeMutation {
      storeUpdate(
        storeId: $storeId
        clientMutationId: $clientMutationId
        expectedRevision: $expectedRevision
        operations: $operations
      ) {
        store {
          ...GeneralSettingsStoreFields
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
  ${GENERAL_SETTINGS_STORE_FRAGMENT}
`;
