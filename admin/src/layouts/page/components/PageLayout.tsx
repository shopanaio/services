import { createStyles } from 'antd-style';
import { Flex } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles(({ css }, { hasRightColumn }: { hasRightColumn: boolean }) => ({
  alert: css`
    padding: 0 var(--x6);
    margin-bottom: var(--x4);
  `,
  grid: css`
    display: grid;
    gap: var(--x4);
    grid-template-columns: 1fr ${hasRightColumn ? '356px' : ''};
    padding: 0 var(--x6) var(--x6);
  `,
}));

interface IPageLayoutProps {
  leftColumn: ReactNode;
  rightColumn?: ReactNode;
  header?: ReactNode;
  alert?: ReactNode;
  name?: string;
}

export const PageLayout = ({
  header,
  leftColumn,
  rightColumn,
  alert,
  name,
}: IPageLayoutProps) => {
  const { styles } = useStyles({ hasRightColumn: !!rightColumn });

  return (
    <div data-testid={`${name}-drawer`}>
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
