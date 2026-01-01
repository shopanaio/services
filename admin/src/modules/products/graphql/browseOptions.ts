import { gql } from '@apollo/client';
import { ApiCollectionMeta, ApiProduct } from '@src/graphql';

export type ApiProductQueryBrowseResponse = {
  productQuery: {
    findMany: {
      data: ApiProduct[];
      meta: ApiCollectionMeta;
    };
  };
};

export const ProductQueryBrowse = gql`
  query ProductBrowseOptions($input: ProductsInput!) {
    productQuery {
      findMany(input: $input) {
        data {
          ...ProductFragment
          variants {
            ...VariantFragment
          }
        }
        meta {
          page
          pageSize
          total
          count
          pageCount
        }
      }
    }
  }
`;
