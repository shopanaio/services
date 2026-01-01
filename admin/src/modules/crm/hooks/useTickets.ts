import { useLazyQuery } from '@apollo/client';
import { CrmQueries } from '@modules/crm/graphql/crm';

import { useOrdersTableNavigation } from '@modules/orders/hooks/useTableNavigation';
import { getOrdersWhereInput } from '@modules/orders/utils/getOrdersWhereInput';
import { CrmColumn, ICrmColumn, ICrmOrder } from '@src/entity/Order/Crm';
import { ApiCrmTicketsQueryInput, ApiQuery } from '@src/graphql';
import { useEffect, useMemo } from 'react';

export const useCrmTickets = () => {
  const navigation = useOrdersTableNavigation();
  const where = getOrdersWhereInput(navigation);

  const [fetchTickets, { data, loading }] = useLazyQuery<
    ApiQuery,
    { input: ApiCrmTicketsQueryInput }
  >(CrmQueries.CrmTicketsQuery, {
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        limit: 1000,
        columns: [],
        where,
      },
    },
  });

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const { ordersMapping, columnTicketsMapping, columnsMapping, columns } =
    useMemo(() => {
      const columns = [] as ICrmColumn[];
      const ordersMapping = {} as Record<ID, ICrmOrder>;
      const columnsMapping = {} as Record<ID, ICrmColumn>;
      const columnTicketsMapping = {} as Record<ID, ICrmOrder[]>;

      if (!data?.crmQuery.getTickets?.length) {
        return {
          ordersMapping,
          columnsMapping,
          columnTicketsMapping,
          columns: [],
        };
      }

      data.crmQuery.getTickets.forEach(({ data, hasNextPage: _ }) => {
        const column = CrmColumn.create(data);
        if (!column) {
          return;
        }

        columns.push(column);
        columnsMapping[column.id] = column;
        columnTicketsMapping[column.id] = column.tickets;
        column.tickets.forEach((order) => {
          ordersMapping[order.id] = order;
        });
      });

      return {
        columns,
        ordersMapping,
        columnsMapping,
        columnTicketsMapping,
      };
    }, [data]);

  return {
    columns,
    columnsMapping,
    columnTicketsMapping,
    ordersMapping,
    loading,
    navigation,
    refetch: fetchTickets,
  };
};
