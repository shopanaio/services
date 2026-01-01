import { gql } from '@apollo/client';
import { ApiProduct } from '@src/graphql';

export type ApiProductQueryFindByListingFiltersResponse = {
  productQuery: {
    findByListingFilters: ApiProduct[];
  };
};

export const ProductQueryByConditions = gql`
  query FindProductByConditions(
    $filters: [CreateListingFilterInput!]!
    $order: String!
  ) {
    productQuery {
      findByListingFilters(filters: $filters, order: $order) {
          ...VariantFragment
      }
    }
  }
`;
