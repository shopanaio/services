import { gql } from '@apollo/client';
import { ApiProduct } from '@src/graphql';

export type ApiProductQueryFindOneResponse = {
  productQuery: {
    findOne: ApiProduct;
  };
};

export const ProductQueryFindOne = gql`
  query FindOneProduct($id: ID!) {
    productQuery {
      findOne(id: $id) {
        ...ProductFragment
        groups {
          ...ProductGroupFragment
        }
      }
    }
  }
`;
