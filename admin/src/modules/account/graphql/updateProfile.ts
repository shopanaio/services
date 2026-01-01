import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export type ApiUserMutationUpdateProfileResponse = {
  userMutation: {
    updateProfile: ApiUser;
  };
};

export const UpdateProfileMutation = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    userMutation {
      updateProfile(input: $input)
    }
  }
`;
