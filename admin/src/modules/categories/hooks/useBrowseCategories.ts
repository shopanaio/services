import { useQuery } from '@apollo/client';
import {
  ApiCategoryQueryOptionsArgs,
  ApiCategoryQueryOptionsResponse,
  CategoryQueryOptions,
} from '@modules/categories/graphql/options';
import { useCategoriesTableNavigation } from '@modules/categories/hooks/useTableNavigation';
import { ApiCollectionMeta } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useEffect, useMemo } from 'react';
import { BrowseCategory } from '@src/entity/Category/BrowseCategory';
import { getCategoriesWhereInput } from '@modules/categories/utils/getWhereInput';
import { ICategory } from '@src/entity/Category/Category';
import { IEntryOption } from '@src/entity/EntryOption/EntryOption';

export const useBrowseCategories = ({
  isActive,
  selectedRows,
  multiple = true,
}: {
  isActive?: boolean;
  multiple?: boolean;
  selectedRows: ICategory[];
}) => {
  const navigation = useCategoriesTableNavigation({
    selectedRowsMode: multiple ? 'multiple' : 'single',
    keepSelectedRows: true,
  });

  const { setSelectedRows } = navigation.selectedRowsProps;
  const where = getCategoriesWhereInput(navigation);
  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where,
  };

  useEffect(() => {
    if (isActive) {
      setSelectedRows(selectedRows);
    }
  }, [isActive, setSelectedRows, selectedRows]);

  const { data, loading, previousData } = useQuery<
    ApiCategoryQueryOptionsResponse,
    ApiCategoryQueryOptionsArgs
  >(CategoryQueryOptions, {
    skip: !isActive,
    fetchPolicy: 'no-cache',
    variables: { input, withCover: true },
  });

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.categoryQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.categoryQuery.findMany.data
      .map(BrowseCategory.create as any)
      .filter(Boolean) as IEntryOption[];
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
    options,
    loading,
    meta,
    navigation,
  };
};
