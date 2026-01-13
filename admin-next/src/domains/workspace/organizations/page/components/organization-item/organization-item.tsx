"use client";

import { Typography, Avatar, Flex, Tag } from "antd";
import { BankOutlined, ShopOutlined, TeamOutlined } from "@ant-design/icons";
import { useStyles } from "../../organizations-page.styles";
import type { IOrganizationItemProps } from "../../types";

export function OrganizationItem({ organization, onClick }: IOrganizationItemProps) {
  const { styles, cx } = useStyles();
  const isActive = organization.status === "active";

  const handleClick = () => {
    if (isActive && onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cx(styles.organizationItem, !isActive && styles.organizationItemDisabled)}
      onClick={handleClick}
    >
      <Flex align="center">
        <Avatar
          size="large"
          style={{
            backgroundColor: isActive
              ? `var(--ant-${organization.color}-2, #e6f4ff)`
              : "#f5f5f5",
          }}
        >
          <BankOutlined
            style={{
              color: isActive
                ? `var(--ant-${organization.color}-6, #1890ff)`
                : "#8c8c8c",
              fontSize: 20,
            }}
          />
        </Avatar>
        <div className={styles.organizationInfo}>
          <Typography.Text className={styles.organizationName}>
            {organization.displayName}
          </Typography.Text>
          <div className={styles.organizationSlug}>{organization.name}</div>
          <div className={styles.organizationMeta}>
            <span>
              <ShopOutlined /> {organization.storesCount} stores
            </span>
            <span>
              <TeamOutlined /> {organization.membersCount} members
            </span>
          </div>
        </div>
      </Flex>
      <Tag color={isActive ? "success" : "default"}>
        {isActive ? "Active" : "Inactive"}
      </Tag>
    </div>
  );
}
