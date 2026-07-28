import { gql } from "@apollo/client";

export const APP_INSTALL_MUTATION = gql`
  mutation AppInstall($input: AppInstallInput!) {
    appsMutation {
      appInstall(input: $input) {
        installation {
          id
          appCode
          status
          installedVersion
          healthStatus
        }
        operation {
          id
          type
          status
        }
        duplicate
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;
