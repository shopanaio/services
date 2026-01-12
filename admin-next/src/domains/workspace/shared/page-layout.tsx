"use client";

import { ReactNode } from "react";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: token.paddingLG,
    display: "flex",
    flexDirection: "column",
    gap: token.marginLG,
  },
}));

interface IPageLayoutProps {
  children: ReactNode;
  className?: string;
}

export const PageLayout = ({ children, className }: IPageLayoutProps) => {
  const { styles, cx } = useStyles();

  return <div className={cx(styles.container, className)}>{children}</div>;
};
