import { gql } from '@apollo/client';

export const UpdatePageMutation = gql`
  mutation UpdatePage($input: UpdatePageInput!) {
    pageMutation {
      update(input: $input)
    }
  }
`;
