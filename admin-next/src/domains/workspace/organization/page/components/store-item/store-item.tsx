"use client";

import { Typography, Avatar, Flex, Tag } from "antd";
import { ShopOutlined, RightOutlined } from "@ant-design/icons";
import { useStyles } from "../../organization-page.styles";
import type { IStoreItemProps } from "../../types";

/**
 * Generate a consistent color based on string hash.
 */
function getColorFromString(str: string): string {
  const colors = ["blue", "purple", "green", "orange", "cyan", "magenta"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function StoreItem({ store, onClick }: IStoreItemProps) {
  const { styles, cx } = useStyles();
  const isActive = store.status === "active";
  const color = getColorFromString(store.id);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cx(styles.storeItem, !isActive && styles.storeItemDisabled)}
      onClick={handleClick}
    >
      <Flex align="center">
        <Avatar
          size="large"
          style={{
            backgroundColor: isActive
              ? `var(--ant-${color}-2, #e6f4ff)`
              : "#f5f5f5",
          }}
        >
          <ShopOutlined
            style={{
              color: isActive
                ? `var(--ant-${color}-6, #1890ff)`
                : "#8c8c8c",
              fontSize: 20,
            }}
          />
        </Avatar>
        <div className={styles.storeInfo}>
          <Typography.Text className={styles.storeName}>
            {store.name}
          </Typography.Text>
          <div className={styles.storeSlug}>{store.slug}</div>
        </div>
      </Flex>
      <Flex align="center" gap={8}>
        <Tag color={isActive ? "success" : "default"}>
          {isActive ? "Active" : "Inactive"}
        </Tag>
        <RightOutlined style={{ color: "#8c8c8c" }} />
      </Flex>
    </div>
  );
}
