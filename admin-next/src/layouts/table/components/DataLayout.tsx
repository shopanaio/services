import { createStyles } from 'antd-style';
import { Flex } from 'antd';
import { ReactNode } from 'react';

import { LayoutSkeleton } from '@/layouts/table/components/Skeleton';
import {
  ITableLayoutHeaderProps,
  TableLayoutHeader,
} from '@/layouts/table/components/Header';

const useStyles = createStyles(({ css, token }, { hasRightColumn }: { hasRightColumn: boolean }) => ({
  wrapper: css`
    padding-top: ${token.padding}px;
    padding-left: ${token.paddingLG}px;
    padding-right: ${token.paddingLG}px;
  `,
  navigationWrapper: css`
    background: ${token.bgGradient};
    bottom: 0;
    margin: 0 -${token.paddingLG}px;
    overflow: hidden;
    padding: ${token.padding}px ${token.paddingLG}px 0;
    position: sticky;
    top: -${token.paddingXXS}px;
    z-index: 100;
  `,
  grid: css`
    display: grid;
    gap: ${token.padding}px;
    grid-template-columns: 1fr ${hasRightColumn ? '356px' : ''};
    padding: 0 ${token.paddingLG}px ${token.paddingLG}px;
    background: ${token.bgGradient};
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
