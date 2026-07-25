import { gql } from "@apollo/client";

export const ADMIN_UI_APPS_QUERY = gql`
  query AdminUiApps {
    appsQuery {
      adminUiApps {
        installationId
        appCode
        displayName
        version
        sdkVersionRange
        grantedScopes
        remote {
          name
          manifestUrl
          contentHash
        }
        page {
          module
          defaultPath
        }
        navigation {
          id
          label
          path
          order
        }
        modals {
          id
          module
          confirmOnDirtyClose
          closeConfirmMessage
          requiredScopes
        }
        extensions {
          id
          point
          module
          priority
          requiredScopes
          conditions
        }
      }
    }
  }
`;

