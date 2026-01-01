import { pageColumns, pageDashboardFilters } from '@modules/pages/defs';
import { EntityStatus } from '@src/graphql';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUsePageTableNavigation {
  columns?: string[];
  defaultStatuses?: EntityStatus[];
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const usePagesTableNavigation = ({
  keepSelectedRows,
  selectedRowsMode,
  pageSize = 25,
  page = 1,
}: IUsePageTableNavigation = {}) => {
  return useTableNavigation({
    selectedRowsMode,
    keepSelectedRows,
    columnsOptions: pageColumns,
    columnsStorageKey: 'table-columns:pages',
    defaultSortBy: pageColumns.createdAt.key,
    filterOptions: pageDashboardFilters,
    pagination: {
      page,
      pageSize,
    },
  });
};
