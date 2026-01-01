import { gql } from '@apollo/client';

export type ApiMutationResetPasswordResponse = boolean;

export const ResetPassword = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    userMutation {
      resetPassword(input: $input)
    }
  }
`;
