import { useQuery } from '@apollo/client';
import {
  ApiCategoryQueryFindManyResponse,
  CategoryQueryFindMany,
} from '@modules/categories/graphql/findMany';
import { useCategoriesTableNavigation } from '@modules/categories/hooks/useTableNavigation';
import { getCategoriesWhereInput } from '@modules/categories/utils/getWhereInput';
import { Category, ICategory } from '@src/entity/Category/Category';
import { ApiCollectionMeta } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useMemo } from 'react';

export const useCategories = () => {
  const navigation = useCategoriesTableNavigation();
  const where = getCategoriesWhereInput({ ...navigation });

  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where,
  };

  const { data, loading, previousData } =
    useQuery<ApiCategoryQueryFindManyResponse>(CategoryQueryFindMany, {
      fetchPolicy: 'no-cache',
      variables: { input },
    });

  const categories = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.categoryQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.categoryQuery.findMany.data
      .map(Category.create)
      .filter(Boolean) as ICategory[];
  }, [data, previousData, loading]);

  const meta: ApiCollectionMeta = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.categoryQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return currentData.categoryQuery.findMany.meta;
  }, [data, previousData, loading]);

  return {
    categories,
    loading,
    meta,
    navigation,
  };
};
