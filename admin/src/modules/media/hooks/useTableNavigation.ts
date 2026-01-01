import { fileColumns, fileDashboardFilters } from '@modules/media/defs';
import { EntityStatus } from '@src/graphql';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseFileTableNavigation {
  columns?: string[];
  defaultStatuses?: EntityStatus[];
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useFilesTableNavigation = ({
  keepSelectedRows,
  pageSize = 25,
  page = 1,
  selectedRowsMode,
}: IUseFileTableNavigation = {}) => {
  return useTableNavigation({
    keepSelectedRows,
    columnsOptions: fileColumns,
    selectedRowsMode,
    columnsStorageKey: 'table-columns:media',
    defaultSortBy: fileColumns.createdAt.key,
    filterOptions: fileDashboardFilters,
    pagination: {
      page,
      pageSize,
    },
  });
};
