import { gql } from '@apollo/client';

export const RevokeApiKeyMutation = gql`
  mutation RevokeApiKey($input: ID!) {
    projectMutation {
      revokeApiKey(input: $input)
    }
  }
`;

export const DeleteApiKeyMutation = gql`
  mutation DeleteApiKey($input: ID!) {
    projectMutation {
      deleteApiKey(input: $input)
    }
  }
`;
