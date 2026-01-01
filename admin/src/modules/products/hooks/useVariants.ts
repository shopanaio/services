import { useQuery } from '@apollo/client';
import { FindManyVariantsQuery } from '@modules/products/graphql/findMany';
import { IProductVariant, ProductVariant } from '@src/entity/Product/Variant';
import { ApiCollectionMeta, ListingSort } from '@src/graphql';
import { useMemo } from 'react';

export const useCategoryProducts = (props: {
  categoryId: number;
  order: ListingSort;
  skip?: boolean;
}) => {
  const { categoryId, order, skip } = props;

  const input = {
    order,
    where: {
      categoryId: {
        Eq: categoryId,
      },
    },
  };

  const { data, loading } = useQuery(FindManyVariantsQuery, {
    fetchPolicy: 'no-cache',
    variables: { input },
    skip,
  });

  const products = useMemo(() => {
    if (!data?.productQuery?.findManyVariants?.data?.length) {
      return [];
    }

    return data.productQuery.findManyVariants.data
      .map(ProductVariant.create)
      .filter(Boolean) as IProductVariant[];
  }, [data]);

  const meta: ApiCollectionMeta = useMemo(() => {
    if (!data?.productQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return data.productQuery.findMany.meta;
  }, [data]);

  return {
    products,
    loading,
    meta,
  };
};
