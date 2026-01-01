import { Box } from '@components/utility/Box';

import { LayoutSkeleton } from '@src/layouts/table/components/Skeleton';
import { useInitialDelay } from '@src/hooks/useInitialDelay';
import {
  ITableLayoutHeaderProps,
  TableLayoutHeader,
} from '@src/layouts/table/components/Header';
import {
  ITableNavigationProps,
  TableNavigation,
} from '@src/layouts/table/components/Navigation/Navigation';
import {
  DataTable,
  IDataTableProps,
} from '@src/layouts/table/components/Table';
import {
  ITablePaginationProps,
  TablePagination,
} from '@src/layouts/table/components/Pagination';
import { Flex } from '@components/utility/Flex';
import { ContainerHeight } from '@components/container/ContainerHeight';
import { css } from '@emotion/react';
import {
  TableBottomBorder,
  TableTopBorder,
} from '@src/layouts/table/components/TableBorders';

interface ITableLayoutProps<TData = any> {
  name?: string;
  headerProps: ITableLayoutHeaderProps;
  navigationProps?: ITableNavigationProps;
  loading?: boolean;
  tableProps: IDataTableProps<TData>;
  paginationProps?: ITablePaginationProps;
}

export const TableLayout = ({
  name,
  headerProps,
  navigationProps,
  tableProps,
  paginationProps,
}: ITableLayoutProps) => {
  const ready = useInitialDelay();

  if (!ready) {
    return <LayoutSkeleton />;
  }

  return (
    <Box pt="4" px="6" data-testid={`${name || 'data'}-layout`}>
      <TableLayoutHeader {...headerProps} />
      <Box
        css={css`
          background: var(--bg-gradient);
          margin: 0 calc(-1 * var(--x4));
          overflow: hidden;
          padding: var(--x4) 15px 0;
          position: sticky;
          top: -4px;
          z-index: 100;
        `}
      >
        {navigationProps && <TableNavigation {...navigationProps} />}
        <div
          css={css`
            background: var(--bg-gradient);
            height: var(--x3);
          `}
        />
      </Box>
      <ContainerHeight offsetBottom={50}>
        <Flex direction="column" w="100%">
          <div
            css={css`
              min-height: var(--container-height);
            `}
          >
            <TableTopBorder />
            <div
              css={css`
                box-sizing: border-box;
                background-color: var(--color-gray-1);
                border-left: 1px solid var(--color-border);
                border-right: 1px solid var(--color-border);
                border-bottom: none;
                width: 100%;
                min-height: var(--table-layout-min-height);
              `}
            >
              <DataTable {...tableProps} />
            </div>
            <TableBottomBorder />
          </div>
        </Flex>
      </ContainerHeight>
      <div
        css={css`
          position: sticky;
          bottom: 0;
          overflow: hidden;
          padding: 0 var(--x6) var(--x4);
          margin: 0 calc(-1 * var(--x6));
          background: var(--bg-gradient);
          z-index: 100;
        `}
      >
        {paginationProps && <TablePagination {...paginationProps} />}
      </div>
    </Box>
  );
};
