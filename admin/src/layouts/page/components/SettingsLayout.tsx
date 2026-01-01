import { createStyles } from 'antd-style';
import { Flex } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles(({ css }, { hasRightColumn }: { hasRightColumn: boolean }) => ({
  wrapper: css`
    max-width: 1000px;
    margin: 0 auto;
  `,
  alert: css`
    padding: 0 var(--x6);
    margin-bottom: var(--x4);
  `,
  grid: css`
    display: grid;
    gap: var(--x4);
    grid-template-columns: ${hasRightColumn ? '300px' : ''} 1fr;
    width: 100%;
  `,
}));

interface ISettingsLayoutProps {
  leftColumn: ReactNode;
  rightColumn?: ReactNode;
  header?: ReactNode;
  alert?: ReactNode;
  name?: string;
}

export const SettingsLayout = ({
  header,
  leftColumn,
  rightColumn,
  alert,
  name,
}: ISettingsLayoutProps) => {
  const { styles } = useStyles({ hasRightColumn: !!rightColumn });

  return (
    <div data-testid={`${name}-page`} className={styles.wrapper}>
      {header}
      {alert && <div className={styles.alert}>{alert}</div>}
      <div className={styles.grid}>
        {rightColumn && (
          <Flex vertical gap="middle">
            {rightColumn}
          </Flex>
        )}
        <Flex vertical gap="middle">
          {leftColumn}
        </Flex>
      </div>
    </div>
  );
};
