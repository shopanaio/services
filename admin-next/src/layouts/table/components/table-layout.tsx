import { createStyles } from 'antd-style';
import { Flex } from 'antd';

import { LayoutSkeleton } from '@/layouts/table/components/skeleton';
import {
  ITableLayoutHeaderProps,
  TableLayoutHeader,
} from '@/layouts/table/components/header';
import {
  DataTable,
  IDataTableProps,
} from '@/layouts/table/components/table';
import {
  ITablePaginationProps,
  TablePagination,
} from '@/layouts/table/components/pagination';
import {
  TableBottomBorder,
  TableTopBorder,
} from '@/layouts/table/components/table-borders';
import {
  ITableNavigationProps,
  TableNavigation,
} from '@/layouts/table/components/navigation/navigation';

const useStyles = createStyles(({ token }) => ({
  wrapper: {
    paddingTop: token.padding,
    paddingLeft: token.paddingLG,
    paddingRight: token.paddingLG,
  },
  navigationWrapper: {
    background: token.bgGradient,
    margin: `0 -${token.padding}px`,
    overflow: 'hidden',
    padding: `${token.padding}px 15px 0`,
    position: 'sticky',
    top: -4,
    zIndex: 100,
  },
  navigationSpacer: {
    background: token.bgGradient,
    height: token.paddingSM,
  },
  tableContainer: {
    minHeight: token.containerHeight,
  },
  tableWrapper: {
    boxSizing: 'border-box',
    backgroundColor: token.colorBgContainer,
    borderLeft: `1px solid ${token.colorBorder}`,
    borderRight: `1px solid ${token.colorBorder}`,
    borderBottom: 'none',
    width: '100%',
    minHeight: token.tableLayoutMinHeight,
  },
  paginationWrapper: {
    position: 'sticky',
    bottom: 0,
    overflow: 'hidden',
    padding: `0 ${token.paddingLG}px ${token.padding}px`,
    margin: `0 -${token.paddingLG}px`,
    background: token.bgGradient,
    zIndex: 100,
  },
}));

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
