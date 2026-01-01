import { gql } from '@apollo/client';

export const UpdateTagMutation = gql`
  mutation UpdateTag($input: UpdateTagInput!) {
    tagMutation {
      update(input: $input)
    }
  }
`;
