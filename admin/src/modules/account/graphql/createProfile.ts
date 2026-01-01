import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export type ApiUserMutationCreateProfileResponse = {
  userMutation: {
    createProfile: ApiUser;
  };
};

export const CreateProfileMutation = gql`
  mutation CreateProfile($input: CreateProfileInput!) {
    userMutation {
      createProfile(input: $input)
    }
  }
`;
