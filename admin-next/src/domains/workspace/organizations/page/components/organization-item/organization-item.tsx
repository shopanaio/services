"use client";

import { Typography, Avatar, Flex } from "antd";
import { BankOutlined, RightOutlined } from "@ant-design/icons";
import { useStyles } from "../../organizations-page.styles";
import type { OrganizationItemProps } from "../../types";

function getColorFromString(str: string): string {
  const colors = ["blue", "purple", "green", "orange", "cyan", "magenta"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function OrganizationItem({ organization, onClick }: OrganizationItemProps) {
  const { styles } = useStyles();
  const color = getColorFromString(organization.id);

  return (
    <div className={styles.organizationItem} onClick={onClick}>
      <Flex align="center">
        <Avatar
          size="large"
          style={{
            backgroundColor: `var(--ant-${color}-2, #e6f4ff)`,
          }}
        >
          <BankOutlined
            style={{
              color: `var(--ant-${color}-6, #1890ff)`,
              fontSize: 20,
            }}
          />
        </Avatar>
        <div className={styles.organizationInfo}>
          <Typography.Text className={styles.organizationName}>
            {organization.displayName}
          </Typography.Text>
          <div className={styles.organizationSlug}>{organization.name}</div>
        </div>
      </Flex>
      <RightOutlined style={{ color: "#8c8c8c" }} />
    </div>
  );
}
