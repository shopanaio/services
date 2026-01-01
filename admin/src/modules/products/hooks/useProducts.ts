import { useQuery } from '@apollo/client';
import {
  ApiProductQueryFindManyResponse,
  ProductQueryFindMany,
} from '@modules/products/graphql/findMany';
import { useProductsTableNavigation } from '@modules/products/hooks/useTableNavigation';
import { getProductsWhereInput } from '@modules/products/utils/getProductsWhereInput';
import { emptyCollectionMeta } from '@src/defs/constants';
import { Product } from '@src/entity/Product/Product';
import { IProductVariant } from '@src/entity/Product/Variant';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiProductQueryFindManyArgs } from '@src/graphql';
import { useApolloRecords } from '@src/hooks/useApolloRecords';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useCallback } from 'react';

export interface IProductTableData extends IProductVariant {
  isRoot: boolean;
  id: ID;
  variants: IProductTableData[];
}

export const useProducts = () => {
  const navigation = useProductsTableNavigation();

  const input = {
    ...navigation.paginationProps,
    order: getApiSort(navigation.sortProps.value),
    where: {
      ...getProductsWhereInput(navigation),
    },
  };

  const { data, loading } = useQuery<
    ApiProductQueryFindManyResponse,
    ApiProductQueryFindManyArgs
  >(ProductQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: { input },
  });

  const getData = useCallback(() => {
    const meta = data?.productQuery?.findMany?.meta || emptyCollectionMeta;
    const product = sanitizeEntries(
      data?.productQuery?.findMany?.data?.map((it) =>
        Product.create(it, { includeContainer: true }),
      ),
    );

    const tableData: IProductTableData[] = product.map((p) => {
      if (p.embedVariant) {
        return {
          ...p.embedVariant,
          isRoot: true,
          id: p.id,
          variants: [],
        } as IProductTableData;
      }

      const [firstVariant, ...restVariants] = p.variants;
      return {
        ...firstVariant,
        id: p.id,
        isRoot: true,
        variants: restVariants.map((v) => ({
          ...v,
          id: v.id,
          isRoot: false,
          variants: [],
        })),
      } as IProductTableData;
    });

    return { products: tableData, meta };
  }, [data]);

  const { products, meta } = useApolloRecords({
    dataFn: getData,
    loading,
    initialData: {
      products: [],
      meta: emptyCollectionMeta,
    },
  });

  return {
    products,
    loading,
    meta,
    navigation,
  };
};
