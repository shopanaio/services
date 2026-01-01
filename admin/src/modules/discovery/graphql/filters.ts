import { gql } from '@apollo/client';
import { ApiFilter } from '@src/graphql';

export type ApiFilterQueryFindManyResponse = {
  filterQuery: {
    findMany: ApiFilter[];
  };
};

export const FilterQueryFindMany = gql`
  query FindManyFilters($input: ProductFiltersInput) {
    filterQuery {
      findMany(input: $input) {
        id
        controlType
        title
        type
        sortIndex
        featureGroup {
          ...FeatureGroupFragment
        }
        createdAt
        updatedAt
      }
    }
  }
`;
