import { gql } from '@apollo/client';

export const CreatePageMutation = gql`
  mutation CreatePage($input: CreatePageInput!) {
    pageMutation {
      create(input: $input)
    }
  }
`;
