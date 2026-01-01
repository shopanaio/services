import { gql } from '@apollo/client';

export const ApiKeyFragment = gql`
  fragment ApiKeyFragment on ApiKey {
    id
    name
    createdAt
    createdBy {
      ...UserFragment
    }
    dueDate
    lastUsedAt
    isBanned
  }
`;
