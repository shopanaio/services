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
import { css } from '@emotion/react';
import { Flex } from '@components/utility/Flex';

export interface IDataLayoutProps {
  name?: string;
  headerProps: ITableLayoutHeaderProps;
  navigationProps?: ITableNavigationProps;
  loading?: boolean;
  leftColumn: React.ReactNode;
  rightColumn?: React.ReactNode;
}

export const DataLayout = ({
  name,
  headerProps,
  navigationProps,
  leftColumn,
  rightColumn,
}: IDataLayoutProps) => {
  const ready = useInitialDelay();

  if (!ready) {
    return <LayoutSkeleton filters={!!navigationProps} />;
  }

  return (
    <Box pt="4" px="6" data-testid={`${name || 'data'}-layout`}>
      <TableLayoutHeader {...headerProps} />
      <Box
        css={css`
          background: var(--bg-gradient);
          bottom: 0;
          margin: 0 calc(-1 * var(--x6));
          overflow: hidden;
          padding: var(--x4) var(--x6) 0;
          position: sticky;
          top: calc(-1 * var(--x1));
          z-index: 100;
        `}
      >
        {navigationProps && <TableNavigation {...navigationProps} />}
      </Box>
      <div
        css={css`
          display: grid;
          gap: var(--x4);
          grid-template-columns: 1fr ${rightColumn ? '356px' : ''};
          padding: 0 var(--x6) var(--x6);
          background: var(--bg-gradient);
        `}
      >
        <Flex direction="column" gap="4">
          {leftColumn}
        </Flex>
        {rightColumn && (
          <Flex direction="column" gap="4">
            {rightColumn}
          </Flex>
        )}
      </div>
    </Box>
  );
};
