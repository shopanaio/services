"use client";

import { Badge, Button, ButtonProps, Flex, Typography } from "antd";
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
  badgeCount?: number;
}

const useStyles = createStyles(({ token }) => ({
  header: {
    display: "flex",
    padding: 16,
    paddingRight: 16,
    height: 48,
    boxSizing: "border-box",
    justifyContent: "space-between",
    alignItems: "center",
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  headerRaw: {
    padding: 0,
    paddingRight: 16,
  },
  titleWrapper: {
    height: "100%",
  },
  title: {
    paddingRight: 12,
    maxWidth: 1000,
  },
}));

export const ModalHeader = ({
  name,
  title,
  rawTitle = false,
  submitButtonProps,
  extra = null,
  badgeCount = 0,
}: IModalHeaderProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={cx(styles.header, rawTitle && styles.headerRaw)}>
      <Flex gap={12} align="center" className={styles.titleWrapper}>
        {rawTitle ? (
          title
        ) : (
          <Badge
            data-testid="page-title-wrapper"
            data-count={badgeCount}
            color="var(--color-primary-10)"
            count={badgeCount}
            overflowCount={9999}
            offset={[badgeCount > 9 ? 6 : 0, 5]}
          >
            <Typography.Title
              level={4}
              ellipsis={{ rows: 1 }}
              className={styles.title}
            >
              {title}
            </Typography.Title>
          </Badge>
        )}
      </Flex>
      <Flex gap={16} align="center">
        {extra}
        {submitButtonProps !== null && (
          <Button
            data-testid={`submit-${name ? `${name}-` : ""}form-button`}
            type="primary"
            children="Save"
            {...submitButtonProps}
          />
        )}
      </Flex>
    </div>
  );
};
