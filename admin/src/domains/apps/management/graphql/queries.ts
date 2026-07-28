import { gql } from "@apollo/client";

export const APPS_MANAGEMENT_QUERY = gql`
  query AppsManagement {
    appsQuery {
      apps(first: 100) {
        edges {
          node {
            code
            displayName
            description
            version
            runtimeStatus
            runtimeHealth {
              status
              message
            }
            installed
            permissions {
              scope
              granted
            }
            capabilities {
              key
              assignmentMode
              operations {
                name
                action
              }
            }
            graphql {
              admin
              storefront
            }
            installation {
              id
              status
              installedVersion
              targetVersion
              healthStatus
              installedAt
              suspendedAt
              updatedAt
              lastError {
                code
                message
              }
              lifecycleOperations(first: 10) {
                totalCount
                edges {
                  node {
                    id
                    type
                    status
                    targetVersion
                    actorType
                    startedAt
                    completedAt
                    createdAt
                    error {
                      code
                      message
                    }
                  }
                }
              }
            }
          }
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
