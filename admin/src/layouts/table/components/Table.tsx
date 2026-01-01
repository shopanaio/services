import { CheckboxProps, Table } from 'antd';
import { MouseEvent, ReactNode } from 'react';
import { ColumnsType, TableProps } from 'antd/es/table';
import { handleCellCheckboxClick } from '@src/utils/utils';
import { css } from '@emotion/react';
import { IEmptyStateProps } from '@components/emptyState/EmptyState';
import { NotFoundTableElement } from '@components/emptyState/EmptyTableState';

export type IDataTableProps<T = any> = Omit<
  TableProps<T>,
  'rowSelection' | 'onRow'
> & {
  name: string;
  data: T[];
  virtual?: boolean;
  columns: ColumnsType<T>;
  showBulkActions?: boolean;
  bulkActions?: {
    options: any;
  };
  layout?: 'fixed' | 'auto';
  className?: string;
  notFountElement?: ReactNode;
  loading?: boolean;
  onRow?: (record: T, e: MouseEvent) => void;
  selectedRows?: T[];
  onChangeSelectedRows?: (
    selectedRowKeys: T[],
    record: T,
    selected: boolean,
  ) => void;
  componentProps?: TableProps<T>;
  rowSelection?: boolean | TableProps<T>['rowSelection'];
  showHeader?: boolean;
  expandable?: TableProps<T>['expandable'];
  notFoundElementProps?: Partial<IEmptyStateProps>;
  getCheckboxProps?: (
    record: T,
  ) => Partial<Omit<CheckboxProps, 'checked' | 'defaultChecked'>>;
};

export const DataTable = ({
  name = 'needs-fix',
  data,
  columns = [],
  virtual,
  layout = 'auto',
  className,
  rowSelection = true,
  notFoundElementProps,
  loading,
  onRow,
  selectedRows = [],
  onChangeSelectedRows = () => {},
  componentProps,
  showHeader = true,
  expandable,
  getCheckboxProps,
  sticky,
  rowKey,
  ...props
}: IDataTableProps) => {
  return (
    <Table
      css={css`
        & td {
          cursor: ${onRow ? 'pointer' : 'default'};
        }
      `}
      showSorterTooltip={false}
      sortDirections={['ascend', 'descend']}
      sticky={
        sticky ? (sticky === true ? { offsetHeader: 64 } : sticky) : undefined
      }
      virtual={virtual}
      {...componentProps}
      expandable={expandable}
      showHeader={showHeader}
      rowSelection={
        rowSelection === true
          ? {
              fixed: 'left',
              onCell: () => ({
                style: { cursor: 'pointer' },
                onClick: handleCellCheckboxClick,
              }),
              preserveSelectedRowKeys: true,
              getCheckboxProps: (record) =>
                ({
                  ...getCheckboxProps?.(record),
                  'data-testid': 'table-row-checkbox',
                }) as any,
              selectedRowKeys: selectedRows.map((it) => {
                if (typeof rowKey === 'string') {
                  return it[rowKey];
                }

                if (typeof rowKey === 'function') {
                  return rowKey(it);
                }

                return it.id;
              }),
              columnWidth: 40,
              onSelect: (record, selected, records) => {
                onChangeSelectedRows(records, record, selected);
              },
              onChange: (_: any, records, info) => {
                if (info.type === 'all') {
                  onChangeSelectedRows(records);
                }

                if (info.type === 'none') {
                  onChangeSelectedRows([]);
                }
              },
            }
          : rowSelection || undefined
      }
      onRow={
        onRow
          ? (record, idx) => ({
              'data-testid': `${name ? `${name}-` : ''}table-row-${idx}`,
              onClick: (e: MouseEvent) => {
                onRow(record, e);
              },
            })
          : undefined
      }
      pagination={false}
      loading={loading}
      locale={{
        emptyText: (
          <NotFoundTableElement {...notFoundElementProps} loading={loading} />
        ),
      }}
      className={className}
      tableLayout={layout}
      columns={columns}
      dataSource={data}
      rowKey={rowKey ? rowKey : ({ id }, idx) => id || idx}
      {...props}
    />
  );
};
