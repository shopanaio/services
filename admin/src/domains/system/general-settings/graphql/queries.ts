import { gql } from "@apollo/client";
import { GENERAL_SETTINGS_STORE_FRAGMENT } from "./fragments";

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
