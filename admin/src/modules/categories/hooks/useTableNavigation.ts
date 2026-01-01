import {
  categoryColumns,
  categoryDashboardFilters,
} from '@modules/categories/defs';
import { EntityStatus } from '@src/graphql';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseCategoryTableNavigation {
  columns?: string[];
  defaultStatuses?: EntityStatus[];
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useCategoriesTableNavigation = ({
  keepSelectedRows,
  selectedRowsMode,
  pageSize = 25,
  page = 1,
}: IUseCategoryTableNavigation = {}) => {
  return useTableNavigation({
    selectedRowsMode,
    keepSelectedRows,
    columnsOptions: categoryColumns,
    columnsStorageKey: 'table-columns:categories',
    defaultSortBy: categoryColumns.updatedAt.key,
    filterOptions: categoryDashboardFilters,
    pagination: {
      page,
      pageSize,
    },
  });
};
