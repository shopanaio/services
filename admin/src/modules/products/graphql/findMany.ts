import { gql } from '@apollo/client';
import { ApiProduct, ApiCollectionMeta } from '@src/graphql';

export type ApiProductQueryFindManyResponse = {
  productQuery: {
    findMany: {
      meta: ApiCollectionMeta;
      data: ApiProduct[];
    };
  };
};

export const ProductQueryFindMany = gql`
  query FindManyProducts($input: ProductsInput!) {
    productQuery {
      findMany(input: $input) {
        data {
          ...ProductFragment
        }
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
      }
    }
  }
`;

export const FindProductsQuery = gql`
  query FindProducts($input: ProductsInput!) {
    productQuery {
      findMany(input: $input) {
        data {
          id
        }
      }
    }
  }
`;

export const FindManyVariantsQuery = gql`
  query FindManyVariants($input: VariantsInput!) {
    productQuery {
      findManyVariants(input: $input) {
        data {
          ...VariantFragment
          listingSortIndex
        }
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
      }
    }
  }
`;
