import { gql } from '@apollo/client';

export type ApiMutationForgotPasswordResponse = boolean;

export const ForgotPassword = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    userMutation {
      forgotPassword(input: $input)
    }
  }
`;
