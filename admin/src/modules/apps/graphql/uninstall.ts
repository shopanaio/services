import { gql } from '@apollo/client';

export const UninstallAppMutation = gql`
  mutation UninstallApp($code: String!) {
    appsMutation {
      uninstall(code: $code)
    }
  }
`;
