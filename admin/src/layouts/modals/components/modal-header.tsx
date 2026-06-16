"use client";

import { Button, ButtonProps, Flex, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { ReactNode } from "react";

export interface IModalHeaderProps {
  children?: ReactNode;
  title: ReactNode;
  rawTitle?: boolean;
  onClose?: () => void;
  submitButtonProps?: ButtonProps | null;
  extra?: ReactNode;
  name?: string;
}

const useStyles = createStyles(({ token }) => ({
  header: {
    display: "flex",
    padding: 0,
    paddingRight: 16,
    height: 48,
    boxSizing: "border-box",
    justifyContent: "space-between",
    alignItems: "center",
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  closeSection: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    height: "100%",
    borderRight: `1px solid ${token.colorBorderSecondary}`,
  },
  closeButton: {
    color: token.colorTextSecondary,
    "&:hover": {
      color: token.colorText,
      background: token.colorBgTextHover,
    },
  },
  escBadge: {
    fontSize: 10,
    fontFamily: "inherit",
    padding: "2px 5px",
    background: token.colorBgContainerDisabled,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 4,
    color: token.colorTextSecondary,
  },
  titleWrapper: {
    height: "100%",
    paddingLeft: 16,
  },
  title: {
    paddingRight: 12,
    maxWidth: 1000,
    fontSize: token.fontSizeLG,
  },
}));

export const ModalHeader = ({
  name,
  title,
  rawTitle = false,
  onClose,
  submitButtonProps,
  extra = null,
}: IModalHeaderProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.header}>
      <Flex align="center" style={{ height: "100%" }}>
        <div className={styles.closeSection}>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className={styles.closeButton}
          />
          <kbd className={styles.escBadge}>esc</kbd>
        </div>
        <Flex gap={12} align="center" className={styles.titleWrapper}>
          {rawTitle ? (
            title
          ) : (
            <Typography.Text className={styles.title}>{title}</Typography.Text>
          )}
        </Flex>
      </Flex>
      <Flex gap={16} align="center">
        {extra}
        {submitButtonProps !== null && (
          <Button
            data-testid={`submit-${name ? `${name}-` : ""}form-button`}
            size="small"
            type="primary"
            {...submitButtonProps}
          >
            Save
          </Button>
        )}
      </Flex>
    </div>
  );
};
