import { createStyles } from 'antd-style';
import { Flex, Tabs, TabsProps } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles(({ css }, { hasRightColumn }: { hasRightColumn: boolean }) => ({
  wrapper: css`
    width: 100%;
    box-sizing: border-box;
  `,
  alert: css`
    padding: 0 var(--x6);
    margin-bottom: var(--x4);
  `,
  grid: css`
    display: grid;
    gap: var(--x4);
    grid-template-columns: 1fr ${hasRightColumn ? '356px' : ''};
    padding: 0 var(--x6) var(--x6);
    background: var(--bg-gradient);
    overflow-x: auto;
  `,
}));

interface IDrawerLayoutProps {
  leftColumn: ReactNode;
  rightColumn?: ReactNode;
  header?: ReactNode;
  alert?: ReactNode;
  name?: string;
}

export const DrawerLayout = ({
  header,
  leftColumn,
  rightColumn,
  alert,
  name,
}: IDrawerLayoutProps) => {
  const { styles } = useStyles({ hasRightColumn: !!rightColumn });

  return (
    <div
      data-testid={`${name ? `${name}-` : ''}drawer`}
      className={styles.wrapper}
    >
      {header}
      {alert && <div className={styles.alert}>{alert}</div>}
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

interface DrawerLayoutWithTabsProps {
  header?: ReactNode;
  alert?: ReactNode;
  name?: string;
  tabs: TabsProps['items'];
}

export const DrawerLayoutWithTabs = ({
  header,
  alert,
  name,
  tabs,
}: DrawerLayoutWithTabsProps) => {
  const { styles } = useStyles({ hasRightColumn: false });

  return (
    <div data-testid={`${name ? `${name}-` : ''}drawer`}>
      {header}
      {alert && <div className={styles.alert}>{alert}</div>}
      <Tabs items={tabs} />
    </div>
  );
};

const useGridStyles = createStyles(({ css }, { hasAside }: { hasAside: boolean }) => ({
  grid: css`
    display: grid;
    gap: var(--x4);
    grid-template-columns: 1fr ${hasAside ? '356px' : ''};
    background: var(--bg-gradient);
  `,
}));

export const DrawerLayoutGrid = ({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) => {
  const { styles } = useGridStyles({ hasAside: !!aside });

  return (
    <div className={styles.grid}>
      <Flex vertical gap="middle" style={{ paddingBottom: 'var(--x14)' }}>
        {children}
      </Flex>
      {aside && (
        <Flex vertical gap="middle">
          {aside}
        </Flex>
      )}
    </div>
  );
};
