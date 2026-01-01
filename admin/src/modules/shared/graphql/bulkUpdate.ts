import { gql } from '@apollo/client';

export const BulkUpdate = gql`
  mutation bulkUpdate($input: BulkUpdateInput!) {
    bulkMutation {
      update(input: $input)
    }
  }
`;
