import { gql } from "@apollo/client";
import { SEARCH_SETTINGS_EDITOR_FRAGMENT } from "./fragments";

export const SEARCH_SETTINGS_EDITOR_QUERY = gql`
  query SearchSettingsEditor {
    listingQuery {
      search {
        settings {
          ...SearchSettingsEditorFields
        }
      }
    }
  }
  ${SEARCH_SETTINGS_EDITOR_FRAGMENT}
`;
