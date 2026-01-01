import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export type ApiUserMutationUpdateEmailResponse = {
  userMutation: {
    updateEmail: ApiUser;
  };
};

export const UpdateEmailMutation = gql`
  mutation UpdateEmail($input: UpdateEmailInput!) {
    userMutation {
      updateEmail(input: $input)
    }
  }
`;
