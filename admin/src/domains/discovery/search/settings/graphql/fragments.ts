import { gql } from "@apollo/client";

export const SEARCH_SETTINGS_EDITOR_FRAGMENT = gql`
  fragment SearchSettingsEditorFields on SearchSettings {
    version
    fields {
      field
      weight
    }
    typoToleranceEnabled
    outOfStockPolicy
    updatedAt
  }
`;

export const SEARCH_SETTINGS_OPERATION_RESULT_FRAGMENT = gql`
  fragment SearchSettingsOperationResultFields on SearchSettingsOperationResult {
    type
    applied
    clientMutationId
    entityId
    errors {
      code
      field
      message
    }
  }
`;
