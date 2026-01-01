import { gql } from '@apollo/client';
import {
  ApiProductQueryFindManyArgs,
  ApiCollectionMeta,
  ApiProduct,
} from '@src/graphql';

export type ApiProductQueryOptionsArgs = ApiProductQueryFindManyArgs & {
  withCover?: boolean;
};

export type ApiProductQueryOptionsResponse = {
  productQuery: {
    findMany: {
      data: Pick<ApiProduct, 'id' | 'title'>[];
      meta: ApiCollectionMeta;
    };
  };
};

export const ProductQueryOptions = gql`
  query ProductOptions($input: ProductsInput!) {
    productQuery {
      findMany(input: $input) {
        data {
          id
          title
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
