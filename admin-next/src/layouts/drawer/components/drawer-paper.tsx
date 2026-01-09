import { createStyles } from 'antd-style';
import { ReactNode } from 'react';

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: token.padding,
    minHeight: 50,
    background: token.colorBgContainer,
    borderRadius: token.borderRadius,
  },
}));

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
