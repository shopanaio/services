import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export const UpdatePasswordMutation = gql`
  mutation UpdatePassword($input: UpdatePasswordInput!) {
    userMutation {
      updatePassword(input: $input)
    }
  }
`;
