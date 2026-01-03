import { createStyles } from 'antd-style';
import { Flex } from 'antd';
import { ReactNode } from 'react';

import { LayoutSkeleton } from '@/layouts/table/components/Skeleton';
import {
  ITableLayoutHeaderProps,
  TableLayoutHeader,
} from '@/layouts/table/components/Header';

const useStyles = createStyles(({ css }, { hasRightColumn }: { hasRightColumn: boolean }) => ({
  wrapper: css`
    padding-top: var(--x4);
    padding-left: var(--x6);
    padding-right: var(--x6);
  `,
  navigationWrapper: css`
    background: var(--bg-gradient);
    bottom: 0;
    margin: 0 calc(-1 * var(--x6));
    overflow: hidden;
    padding: var(--x4) var(--x6) 0;
    position: sticky;
    top: calc(-1 * var(--x1));
    z-index: 100;
  `,
  grid: css`
    display: grid;
    gap: var(--x4);
    grid-template-columns: 1fr ${hasRightColumn ? '356px' : ''};
    padding: 0 var(--x6) var(--x6);
    background: var(--bg-gradient);
  `,
}));

export interface IDataLayoutProps {
  name?: string;
  headerProps: ITableLayoutHeaderProps;
  navigation?: ReactNode;
  loading?: boolean;
  leftColumn: ReactNode;
  rightColumn?: ReactNode;
  ready?: boolean;
}

export const DataLayout = ({
  name,
  headerProps,
  navigation,
  leftColumn,
  rightColumn,
  ready = true,
}: IDataLayoutProps) => {
  const { styles } = useStyles({ hasRightColumn: !!rightColumn });

  if (!ready) {
    return <LayoutSkeleton filters={!!navigation} />;
  }

  return (
    <div className={styles.wrapper} data-testid={`${name || 'data'}-layout`}>
      <TableLayoutHeader {...headerProps} />
      <div className={styles.navigationWrapper}>
        {navigation}
      </div>
      <div className={styles.grid}>
        <Flex vertical gap="middle">
          {leftColumn}
        </Flex>
        {rightColumn && (
          <Flex vertical gap="middle">
            {rightColumn}
          </Flex>
        )}
      </div>
    </div>
  );
};
