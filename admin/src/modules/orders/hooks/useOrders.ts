import { useQuery } from '@apollo/client';
import { OrderQueryFindMany } from '@modules/orders/graphql/findMany';
import { useOrdersTableNavigation } from '@modules/orders/hooks/useTableNavigation';
import { getOrdersWhereInput } from '@modules/orders/utils/getOrdersWhereInput';
import { Order, IOrder } from '@src/entity/Order/Order';
import { ApiQuery } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useMemo } from 'react';

export const useOrders = () => {
  const navigation = useOrdersTableNavigation();
  const where = getOrdersWhereInput(navigation);

  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where,
  };

  const { data, loading } = useQuery<ApiQuery>(OrderQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: { input },
  });

  const orders = useMemo(() => {
    if (!data?.orderQuery?.findMany?.data?.length) {
      return [];
    }

    return data.orderQuery.findMany.data
      .map(Order.create)
      .filter(Boolean) as IOrder[];
  }, [data]);

  const meta = useMemo(() => {
    if (!data?.orderQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return data.orderQuery.findMany.meta;
  }, [data]);

  return {
    orders,
    loading,
    meta,
    navigation,
  };
};
