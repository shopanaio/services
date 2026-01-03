import { createStyles } from 'antd-style';
import { ReactNode } from 'react';

const useStyles = createStyles({
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr 200px',
    gridColumnGap: 'var(--x4)',
  },
});

interface ContentLayoutProps {
  children?: ReactNode;
  aside?: ReactNode;
}

export const ContentLayout = ({ children, aside }: ContentLayoutProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.container}>
      {children}
      {aside}
    </div>
  );
};
