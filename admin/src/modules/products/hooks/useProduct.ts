import { useLazyQuery } from '@apollo/client';
import {
  ApiProductQueryFindOneResponse,
  ProductQueryFindOne,
} from '@modules/products/graphql/findOne';

import { Product } from '@src/entity/Product/Product';
import { ApiProductQueryFindOneArgs } from '@src/graphql';

import { useCallback } from 'react';

export const useFetchProduct = ({ id }: { id: ID }) => {
  const [productQuery] = useLazyQuery<
    ApiProductQueryFindOneResponse,
    ApiProductQueryFindOneArgs
  >(ProductQueryFindOne, {
    fetchPolicy: 'no-cache',
    variables: { id },
  });

  const fetchProduct = useCallback(async () => {
    const { data } = await productQuery();
    if (!data?.productQuery?.findOne) {
      throw new Error('Product not found');
    }

    const product = Product.create(data.productQuery.findOne);
    if (!product) {
      throw new Error('product is not valid');
    }

    return product;
  }, [productQuery]);

  return fetchProduct;
};
