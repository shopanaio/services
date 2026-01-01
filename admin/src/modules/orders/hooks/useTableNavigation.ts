import { useUiFilters } from '@components/filters/UiFilterWidget/useUiFilters';
import { orderColumns, orderDashboardFilters } from '@modules/orders/defs';
import { OrderStatusEnum } from '@src/graphql';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';
import { useSearch } from '@src/layouts/table/hooks/useSearch';

interface IUseOrderTableNavigation {
  defaultStatuses?: OrderStatusEnum[];
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
}

export const useOrdersTableNavigation = ({
  keepSelectedRows,
  pageSize = 25,
  page = 1,
}: IUseOrderTableNavigation = {}) => {
  return useTableNavigation({
    keepSelectedRows,
    columnsOptions: orderColumns,
    columnsStorageKey: 'table-columns:orders',
    defaultSortBy: orderColumns.createdAt.key,
    filterOptions: orderDashboardFilters,
    pagination: {
      page,
      pageSize,
    },
  });
};

export const useOrdersForBoardsTableNavigation =
  ({}: IUseOrderTableNavigation = {}) => {
    const searchProps = useSearch();
    const filtersProps = useUiFilters({ filters: orderDashboardFilters });

    return {
      searchProps,
      filtersProps,
      sortProps,
      localesProps,
    };
  };
