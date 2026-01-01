import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export interface ApiUserMutationSignInResponse {
  userMutation: {
    signIn: {
      jwt: string;
      user: ApiUser;
    };
  };
}

export const SignIn = gql`
  mutation SignIn($input: SignInInput!) {
    userMutation {
      signIn(input: $input) {
        jwt
        user {
          ...UserFragment
        }
      }
    }
  }
`;

export const GoogleSignIn = gql`
  mutation GoogleAuth($token: String!) {
    userMutation {
      googleSignIn(token: $token) {
        jwt
        user {
          ...UserFragment
        }
      }
    }
  }
`;
