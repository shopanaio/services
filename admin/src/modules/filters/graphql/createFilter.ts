import { gql } from '@apollo/client';

export type ApiFilterMutationCreateResponse = {
  filterMutation: {
    create: {
      id: string;
    };
  };
};

export const CreateFilterMutation = gql`
  mutation CreateFilter2($input: CreateFilterInput!) {
    filterMutation {
      create(input: $input) {
        id
      }
    }
  }
`;
