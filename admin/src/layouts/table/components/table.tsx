import { createStyles } from 'antd-style';
import { CheckboxProps, Empty, Table } from 'antd';
import { MouseEvent, ReactNode, Key } from 'react';
import { ColumnsType, TableProps } from 'antd/es/table';

const useStyles = createStyles(({ css }, { hasRowClick }: { hasRowClick: boolean }) => ({
  table: css`
    & td {
      cursor: ${hasRowClick ? 'pointer' : 'default'};
    }
  `,
}));

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
  notFoundElement?: ReactNode;
  loading?: boolean;
  onRow?: (record: T, e: MouseEvent) => void;
  selectedRows?: T[];
  onChangeSelectedRows?: (
    selectedRowKeys: T[],
    record?: T,
    selected?: boolean,
  ) => void;
  componentProps?: TableProps<T>;
  rowSelection?: boolean | TableProps<T>['rowSelection'];
  showHeader?: boolean;
  expandable?: TableProps<T>['expandable'];
  getCheckboxProps?: (
    record: T,
  ) => Partial<Omit<CheckboxProps, 'checked' | 'defaultChecked'>>;
};

export const DataTable = <T extends { id?: string | number }>({
  name = 'needs-fix',
  data,
  columns = [],
  virtual,
  layout = 'auto',
  className,
  rowSelection = true,
  notFoundElement,
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
}: IDataTableProps<T>) => {
  const { styles, cx } = useStyles({ hasRowClick: !!onRow });

  const handleCellCheckboxClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Table
      className={cx(styles.table, className)}
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
                  return it[rowKey as keyof T];
                }

                if (typeof rowKey === 'function') {
                  return rowKey(it);
                }

                return it.id;
              }).filter((key): key is Key => key !== undefined),
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
        emptyText: notFoundElement || <Empty description="No data" />,
      }}
      tableLayout={layout}
      columns={columns}
      dataSource={data}
      rowKey={rowKey ? rowKey : (record, idx) => record.id?.toString() || idx?.toString() || ''}
      {...props}
    />
  );
};
