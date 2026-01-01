import { useQuery } from '@apollo/client';

import { useProductsTableNavigation } from '@modules/products/hooks/useTableNavigation';
import { ApiCollectionMeta, ApiProductQueryFindManyArgs } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useEffect, useMemo } from 'react';
import {
  ApiProductQueryBrowseResponse,
  ProductQueryBrowse,
} from '@modules/products/graphql/browseOptions';
import { IProduct, Product } from '@src/entity/Product/Product';
import { getProductsWhereInput } from '@modules/products/utils/getProductsWhereInput';
import { IProductVariant } from '@src/entity/Product/Variant';

export const useBrowseProducts = ({
  isActive,
  selectedRows,
  multiple = true,
}: {
  selectedRows: (IProduct | IProductVariant)[];
  isActive?: boolean;
  isVariantsMode?: boolean;
  multiple?: boolean;
}) => {
  const navigation = useProductsTableNavigation({
    selectedRowsMode: multiple ? 'multiple' : 'single',
    keepSelectedRows: true,
  });

  const { setSelectedRows } = navigation.selectedRowsProps;

  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where: getProductsWhereInput({
      ...navigation,
    }),
  };

  useEffect(() => {
    if (isActive) {
      setSelectedRows(selectedRows);
    }
  }, [isActive, setSelectedRows, selectedRows]);

  const { data, loading, previousData } = useQuery<
    ApiProductQueryBrowseResponse,
    ApiProductQueryFindManyArgs
  >(ProductQueryBrowse, {
    fetchPolicy: 'no-cache',
    variables: { input },
    skip: !isActive,
  });

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.productQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.productQuery.findMany.data
      .map((it) => Product.create(it))
      .filter(Boolean) as IProduct[];
  }, [data, previousData, loading]);

  const meta: ApiCollectionMeta = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.productQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return currentData.productQuery.findMany.meta;
  }, [data, previousData, loading]);

  return {
    options,
    loading,
    meta,
    navigation,
  };
};
