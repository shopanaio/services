import { menuColumns, menuDashboardFilters } from '@modules/menus/defs';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseMenusTableNavigation {
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useMenusTableNavigation = ({
  keepSelectedRows,
  selectedRowsMode,
  pageSize = 25,
  page = 1,
}: IUseMenusTableNavigation = {}) => {
  return useTableNavigation({
    selectedRowsMode,
    keepSelectedRows,
    columnsOptions: menuColumns,
    columnsStorageKey: 'table-columns:menus',
    defaultSortBy: menuColumns.updatedAt.key,
    filterOptions: menuDashboardFilters,
    pagination: {
      page,
      pageSize,
    },
  });
};
