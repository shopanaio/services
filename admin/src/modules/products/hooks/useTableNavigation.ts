import {
  productColumns,
  productDashboardFilters,
} from '@modules/products/defs';
import { EntityStatus } from '@src/graphql';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseProductTableNavigation {
  defaultStatuses?: EntityStatus[];
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useProductsTableNavigation = ({
  keepSelectedRows,
  pageSize = 25,
  page = 1,
  selectedRowsMode,
}: IUseProductTableNavigation = {}) => {
  return useTableNavigation({
    selectedRowsMode,
    keepSelectedRows,
    columnsOptions: productColumns,
    columnsStorageKey: 'table-columns:products',
    defaultSortBy: productColumns.updatedAt.key,
    filterOptions: productDashboardFilters,
    pagination: {
      page,
      pageSize,
    },
  });
};
