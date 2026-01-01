import { tagColumns, tagDashboardFilters } from '@modules/tags/defs';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseTagTableNavigation {
  columns?: string[];
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useTagsTableNavigation = ({
  keepSelectedRows,
  selectedRowsMode,
  pageSize = 25,
  page = 1,
}: IUseTagTableNavigation = {}) => {
  return useTableNavigation({
    selectedRowsMode,
    keepSelectedRows,
    columnsOptions: tagColumns,
    columnsStorageKey: 'table-columns:tags',
    defaultSortBy: tagColumns.updatedAt.key,
    filterOptions: tagDashboardFilters,
    pagination: {
      page,
      pageSize,
    },
  });
};
