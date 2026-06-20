import { createStyles } from "antd-style";
import type { HTMLAttributes, ReactNode } from "react";

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: token.padding,
    boxSizing: "border-box",
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorBgContainer,
    boxShadow: token.boxShadowTertiary,
    border: `1px solid ${token.colorBorderSecondary}`,
    width: "100%",
  },
}));

interface IPaperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Paper = ({ children, className, ...rest }: IPaperProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={cx(styles.paper, className)} {...rest}>
      {children}
    </div>
  );
};

export type { IPaperProps };
