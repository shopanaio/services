import { useQuery } from '@apollo/client';
import {
  ApiPageQueryOptionsArgs,
  ApiPageQueryOptionsResponse,
} from '@modules/pages/graphql/options';
import { usePagesTableNavigation } from '@modules/pages/hooks/useTableNavigation';
import { ApiCollectionMeta } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useEffect, useMemo } from 'react';
import { IPage, Page } from '@src/entity/Page/Page';
import { getPagesWhereInput } from '@modules/pages/utils/getWhereInput';
import { PageQueryFindMany } from '@modules/pages/graphql/findMany';

export const useBrowsePages = ({
  isActive,
  value,
  multiple = true,
}: {
  value: IPage[];
  isActive?: boolean;
  multiple?: boolean;
}) => {
  const navigation = usePagesTableNavigation({
    selectedRowsMode: multiple ? 'multiple' : 'single',
    keepSelectedRows: true,
  });

  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where: getPagesWhereInput(navigation),
  };

  const { setSelectedRows } = navigation.selectedRowsProps;
  useEffect(() => {
    if (!isActive) {
      return;
    }

    setSelectedRows(value);
  }, [value, setSelectedRows, isActive]);

  const { data, loading, previousData } = useQuery<
    ApiPageQueryOptionsResponse,
    ApiPageQueryOptionsArgs
  >(PageQueryFindMany, {
    skip: !isActive,
    fetchPolicy: 'no-cache',
    variables: { input },
  });

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.pageQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.pageQuery.findMany.data
      .map(Page.create as any)
      .filter(Boolean) as IPage[];
  }, [data, previousData, loading]);

  const meta: ApiCollectionMeta = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.pageQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return currentData.pageQuery.findMany.meta;
  }, [data, previousData, loading]);

  return {
    options,
    loading,
    meta,
    navigation,
  };
};
