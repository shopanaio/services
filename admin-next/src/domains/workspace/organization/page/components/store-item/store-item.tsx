"use client";

import { Typography, Avatar, Flex, Tag } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { useStyles } from "../../organization-page.styles";
import type { IStoreItemProps } from "../../types";

export function StoreItem({ store, onClick }: IStoreItemProps) {
  const { styles, cx } = useStyles();
  const isActive = store.status === "active";

  const handleClick = () => {
    if (isActive && onClick) {
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
              ? `var(--ant-${store.color}-2, #e6f4ff)`
              : "#f5f5f5",
          }}
        >
          <ShopOutlined
            style={{
              color: isActive
                ? `var(--ant-${store.color}-6, #1890ff)`
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
      <Tag color={isActive ? "success" : "default"}>
        {isActive ? "Active" : "Inactive"}
      </Tag>
    </div>
  );
}
