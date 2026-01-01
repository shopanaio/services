import { createStyles } from 'antd-style';
import { ReactNode } from 'react';

const useStyles = createStyles({
  paper: {
    padding: 'var(--x4)',
    minHeight: 50,
    background: 'var(--color-bg-container)',
    borderRadius: 'var(--radius-base)',
  },
});

interface IDrawerPaperProps {
  children: ReactNode;
  className?: string;
}

export const DrawerPaper = ({ children, className }: IDrawerPaperProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={cx(styles.paper, className)}>
      {children}
    </div>
  );
};
