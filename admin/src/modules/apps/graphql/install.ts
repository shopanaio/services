import { gql } from '@apollo/client';

export const InstallAppMutation = gql`
  mutation InstallApp($code: String!) {
    appsMutation {
      install(code: $code)
    }
  }
`;
