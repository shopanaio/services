import { gql } from '@apollo/client';

export const BulkDelete = gql`
  mutation bulkDelete($input: BulkDeleteInput!) {
    bulkMutation {
      delete(input: $input)
    }
  }
`;
