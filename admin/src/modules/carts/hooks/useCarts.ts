import { useQuery } from '@apollo/client';
import { CartQueryFindMany } from '@modules/carts/graphql/findMany';
import { useCartsTableNavigation } from '@modules/carts/hooks/useTableNavigation';
import { ApiQuery } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useMemo } from 'react';

export const useCarts = () => {
  const navigation = useCartsTableNavigation();

  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
  };

  const { data, loading } = useQuery<ApiQuery>(CartQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: { input },
  });

  const carts = useMemo(() => {
    if (!data?.cartQuery?.findMany?.data?.length) {
      return [];
    }

    return data.cartQuery.findMany.data;
  }, [data]);

  const meta = useMemo(() => {
    if (!data?.cartQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return data.cartQuery.findMany.meta;
  }, [data]);

  return {
    carts,
    loading,
    meta,
    navigation,
  };
};
