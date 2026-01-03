import { createStyles } from "antd-style";
import { ReactNode } from "react";

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: token.padding,
    boxSizing: "border-box",
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorBgContainer,
    boxShadow: token.boxShadowTertiary,
    width: "100%",
  },
}));

interface IPaperProps {
  children: ReactNode;
  className?: string;
}

export const Paper = ({ children, className }: IPaperProps) => {
  const { styles, cx } = useStyles();

  return <div className={cx(styles.paper, className)}>{children}</div>;
};
