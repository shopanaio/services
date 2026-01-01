import { reviewColumns } from '@modules/reviews/defs';
import { useTableNavigation } from '@src/layouts/table/hooks/useNavigation';

interface IUseReviewTableNavigation {
  pageSize?: number;
  page?: number;
  keepSelectedRows?: boolean;
}

export const useReviewsTableNavigation = ({
  keepSelectedRows,
  pageSize = 25,
  page = 1,
}: IUseReviewTableNavigation = {}) => {
  return useTableNavigation({
    keepSelectedRows,
    columnsOptions: reviewColumns,
    columnsStorageKey: 'table-columns:reviews',
    defaultSortBy: reviewColumns.createdAt.key,
    filterOptions: [],
    pagination: {
      page,
      pageSize,
    },
  });
};
