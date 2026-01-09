"use client";

import { createStyles } from "antd-style";
import { ReactNode } from "react";
import { ModalHeader, IModalHeaderProps } from "./modal-header";

interface IModalLayoutProps {
  children?: ReactNode;
  headerProps?: IModalHeaderProps;
  header?: ReactNode;
  name?: string;
  fullWidth?: boolean;
  bodyClassName?: string;
}

const useStyles = createStyles(({ token }) => ({
  container: {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    borderRadius: 8,
    overflow: "hidden",
  },
  body: {
    background: token.colorBgLayout,
    overflowY: "auto",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  content: {
    marginInline: "auto",
    width: "100%",
    maxWidth: 800,
    display: "flex",
    gap: 16,
    flexDirection: "column",
    paddingBlock: 16,
    flex: 1,
    minHeight: 0,
  },
  contentFullWidth: {
    marginInline: "auto",
    maxWidth: "none",
    display: "flex",
    gap: 16,
    flexDirection: "column",
    paddingBlock: 16,
    paddingInline: 16,
    flex: 1,
    minHeight: 0,
  },
}));

export const ModalLayout = ({
  headerProps,
  header,
  children,
  name,
  fullWidth,
  bodyClassName,
}: IModalLayoutProps) => {
  const { styles, cx } = useStyles();

  return (
    <div
      data-testid={`${name ? `${name}-` : ""}modal`}
      className={styles.container}
    >
      {header ?? (headerProps && <ModalHeader {...{ ...headerProps, name }} />)}
      <div className={cx(styles.body, bodyClassName)}>
        <div className={fullWidth ? styles.contentFullWidth : styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};
