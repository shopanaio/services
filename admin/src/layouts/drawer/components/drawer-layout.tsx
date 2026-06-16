import { createStyles } from 'antd-style';
import { Flex, Tabs, TabsProps } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles(({ css, token }, { hasRightColumn }: { hasRightColumn: boolean }) => ({
  wrapper: css`
    width: 100%;
    box-sizing: border-box;
  `,
  alert: css`
    padding: 0 ${token.paddingLG}px;
    margin-bottom: ${token.padding}px;
  `,
  grid: css`
    display: grid;
    gap: ${token.padding}px;
    grid-template-columns: 1fr ${hasRightColumn ? '356px' : ''};
    padding: 0 ${token.paddingLG}px ${token.paddingLG}px;
    background: ${token.colorBgContainer};
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

const useGridStyles = createStyles(({ css, token }, { hasAside }: { hasAside: boolean }) => ({
  grid: css`
    display: grid;
    gap: ${token.padding}px;
    grid-template-columns: 1fr ${hasAside ? '356px' : ''};
    background: ${token.colorBgLayout};
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
      <Flex vertical gap="middle" style={{ paddingBottom: 56 }}>
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
