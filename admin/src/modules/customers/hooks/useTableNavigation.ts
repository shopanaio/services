import { customerColumns, searchOptions } from '@modules/customers/defs';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseCustomerTableNavigation {
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useCustomersTableNavigation = ({
  keepSelectedRows,
  selectedRowsMode,
  pageSize = 25,
  page = 1,
}: IUseCustomerTableNavigation = {}) => {
  return useTableNavigation({
    selectedRowsMode,
    keepSelectedRows,
    columnsOptions: customerColumns,
    columnsStorageKey: 'table-columns:customers',
    defaultSortBy: customerColumns.updatedAt.key,
    filterOptions: [],
    pagination: {
      page,
      pageSize,
    },
  });
};
