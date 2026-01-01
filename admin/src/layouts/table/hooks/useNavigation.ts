import { useUiFilters } from '@components/filters/UiFilterWidget/useUiFilters';
import { useDefaultLocale } from '@modules/locales/hooks/useLocales';
import { UiFilter } from '@src/entity/UiFilter';
import { ITableNavigationProps } from '@src/layouts/table/components/Navigation/Navigation';
import {
  IColumnOptions,
  useColumns,
} from '@src/layouts/table/hooks/useColumns';
import { usePagination } from '@src/layouts/table/hooks/usePagination';
import { useSearch } from '@src/layouts/table/hooks/useSearch';
import { useSelectedRows } from '@src/layouts/table/hooks/useSelectedRows';
import { useSortBy } from '@src/layouts/table/hooks/useSortBy';
import { useCallback, useEffect } from 'react';

export interface IUseNavigationProps {
  columnsOptions: IColumnOptions;
  filterOptions: UiFilter.IUiFilter[];
  defaultSortBy: string;
  columnsStorageKey?: string;
  pagination?: {
    page: number;
    pageSize: number;
  };
  keepSelectedRows?: boolean;
  selectedRowsMode?: 'single' | 'multiple';
}

export const useTableNavigation = ({
  selectedRowsMode = 'multiple',
  keepSelectedRows,
  columnsOptions,
  columnsStorageKey,
  filterOptions,
  defaultSortBy,
  pagination,
}: IUseNavigationProps): Omit<ITableNavigationProps, 'actionsProps'> => {
  const locale = useDefaultLocale();

  const selectedRowsProps = useSelectedRows({
    multiple: selectedRowsMode === 'multiple',
  });

  const columnsProps = useColumns({
    options: columnsOptions,
    storageKey: columnsStorageKey,
  });

  const filtersProps = useUiFilters({
    filters: filterOptions,
  });

  const searchProps = useSearch();

  const sortProps = useSortBy({
    defaultProperty: defaultSortBy,
    options: [],
  });

  const { page: initialPage } = pagination || {};
  const paginationProps = usePagination(pagination);

  const { setPage, page, pageSize } = paginationProps;
  const { clearSelectedRows } = selectedRowsProps;

  useEffect(() => {
    window.scrollTo(0, 0);
    setPage(initialPage || 1);

    if (!keepSelectedRows) {
      clearSelectedRows();
    }
  }, [
    sortProps.value,
    sortProps.value,
    filtersProps.value,
    setPage,
    initialPage,
    pageSize,
    clearSelectedRows,
    searchProps.searchValue,
    keepSelectedRows,
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!keepSelectedRows) {
      clearSelectedRows();
    }
  }, [page, clearSelectedRows, keepSelectedRows]);

  const resetState = useCallback(() => {
    clearSelectedRows();
    setPage(page);
    sortProps.reset();
    filtersProps.reset();
    searchProps.reset();
    columnsProps.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    selectedRowsProps,
    columnsProps,
    filtersProps,
    paginationProps,
    searchProps,
    sortProps,
    resetState,
    localesProps: {
      locale,
    },
  };
};
