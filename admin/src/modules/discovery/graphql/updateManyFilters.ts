import { gql } from '@apollo/client';

export type ApiFilterMutationUpdateResponse = {
  filterMutation: {
    updateMany: boolean;
  };
};

export const UpdateManyFilterMutation = gql`
  mutation UpdateManyFilters($input: [UpdateFilterInput!]!) {
    filterMutation {
      updateMany(input: $input)
    }
  }
`;
