import { gql } from '@apollo/client';

export const ApiKeyQueryFindMany = gql`
  query FindManyApiKeys {
    projectQuery {
      apiKeys {
        ...ApiKeyFragment
      }
    }
  }
`;
