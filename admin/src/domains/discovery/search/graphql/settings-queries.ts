import { gql } from "@apollo/client";
import { SEARCH_SETTINGS_EDITOR_FRAGMENT } from "./settings-fragments";

export const SEARCH_CONFIGURATION_EDITOR_CONTEXT_QUERY = gql`
  query SearchConfigurationEditorContext {
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
