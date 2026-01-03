import { createStyles } from 'antd-style';
import { Badge, Flex, Typography } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles({
  header: {
    '&:not(:last-child)': {
      marginBottom: 'var(--x4)',
    },
  },
  title: {
    fontSize: 15,
    paddingRight: 'var(--x3)',
  },
});

export interface IDrawerPaperProps {
  title: ReactNode;
  extra?: ReactNode;
  badgeCount?: number;
  name: string;
  showZero?: boolean;
}

export const DrawerPaperHeader = ({
  title,
  extra,
  badgeCount,
  name,
  showZero = true,
}: IDrawerPaperProps) => {
  const { styles } = useStyles();

  const renderTitle = () => {
    if (typeof title === 'string') {
      let t = (
        <Typography.Text strong className={styles.title}>
          {title}
        </Typography.Text>
      );

      if (typeof badgeCount === 'number') {
        t = (
          <Badge
            count={badgeCount}
            showZero={showZero}
            data-testid={`${name}-count-badge`}
            data-count={badgeCount}
            color="var(--color-primary-10)"
            overflowCount={9999}
            offset={[badgeCount > 9 ? 6 : 0, 5]}
          >
            {t}
          </Badge>
        );
      }

      return <div style={{ width: '100%' }}>{t}</div>;
    }

    return title;
  };

  return (
    <Flex
      style={{ height: 32 }}
      align="center"
      justify="space-between"
      data-testid={`${name || 'needs-fix'}-header`}
      className={styles.header}
    >
      {renderTitle()}
      {extra}
    </Flex>
  );
};
