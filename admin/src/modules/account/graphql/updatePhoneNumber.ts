import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export type ApiMutationUpdatePhoneNumberResponse = {
  userMutation: {
    updatePhoneNumber: ApiUser;
  };
};

export const UpdatePhoneNumberMutation = gql`
  mutation updatePhoneNumber($input: UpdatePhoneNumberInput!) {
    userMutation {
      updatePhoneNumber(input: $input)
    }
  }
`;
