import { gql } from '@apollo/client';

export const DeleteAccountMutation = gql`
  mutation DeleteAccount {
    userMutation {
      delete
    }
  }
`;
