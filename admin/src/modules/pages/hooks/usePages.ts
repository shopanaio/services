import { useQuery } from '@apollo/client';
import {
  ApiPageQueryFindManyResponse,
  PageQueryFindMany,
} from '@modules/pages/graphql/findMany';
import { usePagesTableNavigation } from '@modules/pages/hooks/useTableNavigation';
import { Page, IPage } from '@src/entity/Page/Page';
import { ApiCollectionMeta } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useMemo } from 'react';
import { getPagesWhereInput } from '@modules/pages/utils/getWhereInput';

export const usePages = () => {
  const navigation = usePagesTableNavigation();
  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where: getPagesWhereInput(navigation),
  };

  const { data, loading, previousData } =
    useQuery<ApiPageQueryFindManyResponse>(PageQueryFindMany, {
      fetchPolicy: 'no-cache',
      variables: { input },
    });

  const pages = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.pageQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.pageQuery.findMany.data
      .map(Page.create)
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
    pages,
    loading,
    meta,
    navigation,
  };
};
