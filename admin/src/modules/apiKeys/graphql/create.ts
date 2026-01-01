import { gql } from '@apollo/client';

export const CreateApiKeyMutation = gql`
  mutation CreateApiKey($input: CreateApiKeyInput!) {
    projectMutation {
      createApiKey(input: $input)
    }
  }
`;
