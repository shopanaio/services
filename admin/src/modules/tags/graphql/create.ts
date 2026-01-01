import { gql } from '@apollo/client';

export const CreateTagMutation = gql`
  mutation CreateTag($input: CreateTagInput!) {
    tagMutation {
      create(input: $input)
    }
  }
`;
