import { Flex } from 'antd';
import { ReactNode } from 'react';
import { Actions, IActionsProps } from './Actions';
import {
  FilterWidget,
  IFilterWidgetProps,
  IFilterWidgetSearchProps,
} from '@/layouts/filters';
import { IColumnsProps } from './Columns';
import { ISortByProps } from './SortBy';

export interface ISelectedRowsProps<T = unknown> {
  selectedRows: T[];
  onChangeSelectedRows: (rows: T[], record?: T, selected?: boolean) => void;
  clearSelectedRows: () => void;
}

/** Filter props for table navigation */
export interface IFiltersProps {
  options: IFilterWidgetProps['options'];
  value: IFilterWidgetProps['value'];
  onChange: IFilterWidgetProps['onChange'];
}

/** Search props for table navigation */
export interface ISearchProps extends IFilterWidgetSearchProps {}

export interface ITableNavigationProps<T = unknown> {
  sortProps?: ISortByProps;
  columnsProps?: IColumnsProps;
  searchProps: ISearchProps;
  actionsProps?: Omit<IActionsProps<T>, 'selectedRows' | 'clearSelectedRows'>;
  filtersProps: IFiltersProps;
  selectedRowsProps: ISelectedRowsProps<T>;
  extra?: ReactNode;
}

export const TableNavigation = <T extends { id?: string | number }>({
  actionsProps,
  searchProps,
  filtersProps,
  selectedRowsProps,
}: ITableNavigationProps<T>) => {
  const { selectedRows, clearSelectedRows } = selectedRowsProps;

  return (
    <Flex gap="small" align="center" style={{ width: '100%' }}>
      {!!selectedRows?.length && actionsProps && (
        <Actions
          {...actionsProps}
          selectedRows={selectedRows}
          clearSelectedRows={clearSelectedRows}
        />
      )}
      <FilterWidget
        options={filtersProps.options}
        value={filtersProps.value}
        onChange={filtersProps.onChange}
        searchProps={searchProps}
      />
    </Flex>
  );
};
