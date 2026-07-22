import { gql } from "@apollo/client";
import { GENERAL_SETTINGS_STORE_FRAGMENT } from "./fragments";
import { CUSTOMER_ACCOUNTS_SETTINGS_FRAGMENT } from "./fragments";

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

export const CREATE_STORE_LANGUAGE_MUTATION = gql`
  mutation CreateStoreLanguage($input: LocaleCreateInput!) {
    storeMutation {
      localeCreate(input: $input) {
        locale {
          code
          name
          isActive
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

export const DELETE_STORE_LANGUAGE_MUTATION = gql`
  mutation DeleteStoreLanguage($input: LocaleDeleteInput!) {
    storeMutation {
      localeDelete(input: $input) {
        deletedLocaleCode
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const SET_DEFAULT_STORE_LANGUAGE_MUTATION = gql`
  mutation SetDefaultStoreLanguage($input: LocaleSetDefaultInput!) {
    storeMutation {
      localeSetDefault(input: $input) {
        success
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const UPDATE_CUSTOMER_ACCOUNTS_SETTINGS_MUTATION = gql`
  mutation UpdateCustomerAccountsSettings(
    $input: CustomerAccountsSettingsUpdateInput!
  ) {
    customersMutation {
      customerAccountsSettingsUpdate(input: $input) {
        settings {
          ...CustomerAccountsSettingsFields
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
  ${CUSTOMER_ACCOUNTS_SETTINGS_FRAGMENT}
`;
