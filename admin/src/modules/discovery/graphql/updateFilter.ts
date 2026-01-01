import { gql } from '@apollo/client';

export type ApiFilterMutationUpdateResponse = {
  filterMutation: {
    update: {
      id: string;
    };
  };
};

export const UpdateFilterMutation = gql`
  mutation UpdateFilter($input: UpdateFilterInput!) {
    filterMutation {
      update(input: $input) {
        id
      }
    }
  }
`;
