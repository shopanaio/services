import { gql } from "@apollo/client";
import {
  SEARCH_SETTINGS_EDITOR_FRAGMENT,
  SEARCH_SETTINGS_OPERATION_RESULT_FRAGMENT,
} from "./fragments";

export const SEARCH_SETTINGS_UPDATE_MUTATION = gql`
  mutation SearchSettingsUpdate(
    $expectedVersion: Int!
    $operations: SearchSettingsOperationsInput!
  ) {
    listingMutation {
      search {
        settingsUpdate(expectedVersion: $expectedVersion, operations: $operations) {
          settings {
            ...SearchSettingsEditorFields
          }
          operationResults {
            ...SearchSettingsOperationResultFields
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    }
  }
  ${SEARCH_SETTINGS_EDITOR_FRAGMENT}
  ${SEARCH_SETTINGS_OPERATION_RESULT_FRAGMENT}
`;
