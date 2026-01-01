import { createStyles } from 'antd-style';
import { Flex } from 'antd';

import { LayoutSkeleton } from '@/layouts/table/components/Skeleton';
import {
  ITableLayoutHeaderProps,
  TableLayoutHeader,
} from '@/layouts/table/components/Header';
import {
  DataTable,
  IDataTableProps,
} from '@/layouts/table/components/Table';
import {
  ITablePaginationProps,
  TablePagination,
} from '@/layouts/table/components/Pagination';
import {
  TableBottomBorder,
  TableTopBorder,
} from '@/layouts/table/components/TableBorders';
import {
  ITableNavigationProps,
  TableNavigation,
} from '@/layouts/table/components/Navigation/Navigation';

const useStyles = createStyles({
  wrapper: {
    paddingTop: 'var(--x4)',
    paddingLeft: 'var(--x6)',
    paddingRight: 'var(--x6)',
  },
  navigationWrapper: {
    background: 'var(--bg-gradient)',
    margin: '0 calc(-1 * var(--x4))',
    overflow: 'hidden',
    padding: 'var(--x4) 15px 0',
    position: 'sticky',
    top: -4,
    zIndex: 100,
  },
  navigationSpacer: {
    background: 'var(--bg-gradient)',
    height: 'var(--x3)',
  },
  tableContainer: {
    minHeight: 'var(--container-height)',
  },
  tableWrapper: {
    boxSizing: 'border-box',
    backgroundColor: 'var(--color-gray-1)',
    borderLeft: '1px solid var(--color-border)',
    borderRight: '1px solid var(--color-border)',
    borderBottom: 'none',
    width: '100%',
    minHeight: 'var(--table-layout-min-height)',
  },
  paginationWrapper: {
    position: 'sticky',
    bottom: 0,
    overflow: 'hidden',
    padding: '0 var(--x6) var(--x4)',
    margin: '0 calc(-1 * var(--x6))',
    background: 'var(--bg-gradient)',
    zIndex: 100,
  },
});

interface ITableLayoutProps<TData = unknown> {
  name?: string;
  headerProps: ITableLayoutHeaderProps;
  navigationProps?: ITableNavigationProps<TData>;
  loading?: boolean;
  tableProps: IDataTableProps<TData>;
  paginationProps?: ITablePaginationProps;
  ready?: boolean;
}

export const TableLayout = <TData extends { id?: string | number }>({
  name,
  headerProps,
  navigationProps,
  tableProps,
  paginationProps,
  ready = true,
}: ITableLayoutProps<TData>) => {
  const { styles } = useStyles();

  if (!ready) {
    return <LayoutSkeleton />;
  }

  return (
    <div className={styles.wrapper} data-testid={`${name || 'data'}-layout`}>
      <TableLayoutHeader {...headerProps} />
      <div className={styles.navigationWrapper}>
        {navigationProps && <TableNavigation {...navigationProps} />}
        <div className={styles.navigationSpacer} />
      </div>
      <Flex vertical style={{ width: '100%' }}>
        <div className={styles.tableContainer}>
          <TableTopBorder />
          <div className={styles.tableWrapper}>
            <DataTable {...tableProps} />
          </div>
          <TableBottomBorder />
        </div>
      </Flex>
      <div className={styles.paginationWrapper}>
        {paginationProps && <TablePagination {...paginationProps} />}
      </div>
    </div>
  );
};
