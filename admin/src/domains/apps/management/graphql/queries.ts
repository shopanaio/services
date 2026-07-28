import { gql } from "@apollo/client";

export const APPS_MANAGEMENT_QUERY = gql`
  query AppsManagement {
    appsQuery {
      availableApps {
        code
        displayName
        description
        version
        runtimeStatus
        installed
        permissions {
          scope
          granted
        }
        installation {
          id
          status
          installedVersion
          healthStatus
        }
      }
    }
  }
`;

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
