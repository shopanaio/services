import { gql } from "@apollo/client";
import { GENERAL_SETTINGS_STORE_FRAGMENT } from "./fragments";
import { CUSTOMER_ACCOUNTS_SETTINGS_FRAGMENT } from "./fragments";

export const GENERAL_SETTINGS_QUERY = gql`
  query GeneralSettings {
    storeQuery {
      currentStore {
        ...GeneralSettingsStoreFields
      }
    }
  }
  ${GENERAL_SETTINGS_STORE_FRAGMENT}
`;

export const CUSTOMER_ACCOUNTS_SETTINGS_QUERY = gql`
  query CustomerAccountsSettings {
    customersQuery {
      customerAccountsSettings {
        ...CustomerAccountsSettingsFields
      }
    }
  }
  ${CUSTOMER_ACCOUNTS_SETTINGS_FRAGMENT}
`;
