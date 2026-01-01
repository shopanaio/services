import { cartColumns } from '@modules/carts/defs';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseCartsTableNavigation {
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useCartsTableNavigation = ({
  keepSelectedRows,
  pageSize = 25,
  page = 1,
  selectedRowsMode,
}: IUseCartsTableNavigation = {}) => {
  return useTableNavigation({
    selectedRowsMode,
    keepSelectedRows,
    columnsOptions: cartColumns,
    columnsStorageKey: 'table-columns:carts',
    defaultSortBy: cartColumns.updatedAt.key,
    filterOptions: [],
    pagination: {
      page,
      pageSize,
    },
  });
};
