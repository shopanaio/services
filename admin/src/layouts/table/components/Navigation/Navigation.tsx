import { Flex } from '@components/utility/Flex';
import {
  Actions,
  IActionsProps,
} from '@src/layouts/table/components/Navigation/Actions';

import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { ReactNode } from 'react';
import { IPaginationProps } from '@src/layouts/table/hooks/usePagination';
import { ISelectedRowsProps } from '@src/layouts/table/hooks/useSelectedRows';
import { UiFilterWidget } from '@components/filters/UiFilterWidget/UiFilterWidget';
import { IColumnsProps } from '@src/layouts/table/components/Navigation/Columns';
import { ISortByProps } from '@src/layouts/table/components/Navigation/SortBy';
import { ISearchProps } from '@src/layouts/table/hooks/useSearch';

export interface ILocalesProps {
  locale: string;
}

export interface ITableNavigationProps {
  sortProps: ISortByProps;
  localesProps: ILocalesProps;
  columnsProps: IColumnsProps;
  selectedCount?: number;
  className?: string;
  searchProps: ISearchProps;
  actionsProps: IActionsProps;
  filtersProps: IFiltersProps;
  paginationProps: IPaginationProps;
  selectedRowsProps: ISelectedRowsProps<any>;
  resetState: () => void;
  extra?: ReactNode;
}

export const TableNavigation = ({
  actionsProps,
  searchProps,
  filtersProps,
  selectedRowsProps,
}: ITableNavigationProps) => {
  const { selectedRows, clearSelectedRows } = selectedRowsProps;

  return (
    <Flex gap="2" align="center" w="100%">
      {!!selectedRows?.length && (
        <Actions
          {...actionsProps}
          selectedRows={selectedRows}
          clearSelectedRows={clearSelectedRows}
        />
      )}
      <UiFilterWidget filtersProps={filtersProps} searchProps={searchProps} />
    </Flex>
  );
};
