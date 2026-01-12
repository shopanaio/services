"use client";

import { ReactNode } from "react";
import { createStyles } from "antd-style";
import { Typography, Flex } from "antd";

const useStyles = createStyles(({ token }) => ({
  section: {
    padding: token.paddingLG,
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowTertiary,
  },
  header: {
    marginBottom: token.marginLG,
    paddingBottom: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  title: {
    fontSize: token.fontSizeLG,
    fontWeight: 600,
    margin: 0,
  },
  description: {
    color: token.colorTextSecondary,
    marginTop: token.marginXS,
  },
}));

interface ISettingsSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const SettingsSection = ({
  title,
  description,
  actions,
  children,
  className,
}: ISettingsSectionProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={cx(styles.section, className)}>
      <Flex
        justify="space-between"
        align="flex-start"
        className={styles.header}
      >
        <div>
          <Typography.Title level={5} className={styles.title}>
            {title}
          </Typography.Title>
          {description && (
            <Typography.Text className={styles.description}>
              {description}
            </Typography.Text>
          )}
        </div>
        {actions}
      </Flex>
      {children}
    </div>
  );
};
