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

export const APP_SUSPEND_MUTATION = gql`
  mutation AppSuspend($input: AppInstallationActionInput!) {
    appsMutation {
      appSuspend(input: $input) {
        installation {
          id
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

export const APP_RESUME_MUTATION = gql`
  mutation AppResume($input: AppInstallationActionInput!) {
    appsMutation {
      appResume(input: $input) {
        installation {
          id
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

export const APP_UNINSTALL_MUTATION = gql`
  mutation AppUninstall($input: AppInstallationActionInput!) {
    appsMutation {
      appUninstall(input: $input) {
        installation {
          id
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
