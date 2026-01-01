import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export interface ApiUserMutationSignUpResponse {
  userMutation: {
    signUp: {
      jwt: string;
      user: ApiUser;
    };
  };
}

export const SignUp = gql`
  mutation SignUp($input: SignUpInput!) {
    userMutation {
      signUp(input: $input) {
        jwt
        user {
          ...UserFragment
        }
      }
    }
  }
`;
