"use client";

import { useState } from "react";
import { Typography, Avatar, Tag, Tabs, Empty, Flex } from "antd";
import { createStyles } from "antd-style";
import { ShopOutlined } from "@ant-design/icons";
import { SettingsLayout } from "../../layout";

const useStyles = createStyles(({ token }) => ({
  storeItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: token.paddingMD,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
      borderColor: token.colorPrimaryBorder,
    },
  },
  storeItemDisabled: {
    cursor: "not-allowed",
    opacity: 0.6,
    "&:hover": {
      backgroundColor: token.colorBgContainer,
      borderColor: token.colorBorder,
    },
  },
  avatar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  storeInfo: {
    marginLeft: token.marginMD,
  },
  storeName: {
    fontWeight: 500,
    marginBottom: 0,
  },
  storeSlug: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  badge: {
    padding: `${token.paddingXXS}px ${token.paddingSM}px`,
    fontSize: token.fontSizeSM,
    fontWeight: 400,
    borderRadius: token.borderRadius,
    marginLeft: "auto",
  },
  badgeActive: {
    backgroundColor: token.colorSuccessBg,
    color: token.colorSuccess,
  },
  badgeInactive: {
    backgroundColor: token.colorBgTextHover,
    color: token.colorTextSecondary,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginSM,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: `${token.paddingXL * 2}px 0`,
  },
  tabsWrapper: {
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingLG,
    boxShadow: token.boxShadowTertiary,
  },
}));

interface Store {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  color: string;
}

// Mock data
const mockStores: Store[] = [
  {
    id: "store-1",
    name: "Main Store",
    slug: "main-store",
    status: "active",
    color: "blue",
  },
  {
    id: "store-2",
    name: "Fashion Outlet",
    slug: "fashion-outlet",
    status: "active",
    color: "purple",
  },
  {
    id: "store-3",
    name: "Electronics Hub",
    slug: "electronics-hub",
    status: "active",
    color: "green",
  },
  {
    id: "store-4",
    name: "Home Decor",
    slug: "home-decor",
    status: "inactive",
    color: "orange",
  },
  {
    id: "store-5",
    name: "Sports Gear",
    slug: "sports-gear",
    status: "active",
    color: "red",
  },
];

interface StoreItemProps {
  store: Store;
  onClick?: () => void;
}

const StoreItem = ({ store, onClick }: StoreItemProps) => {
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
      data-testid="store-item"
    >
      <Flex align="center">
        <Avatar
          size="large"
          className={styles.avatar}
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
};

const NoStores = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.emptyState} data-testid="no-stores">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Typography.Text type="secondary">
            No stores found in this organization
          </Typography.Text>
        }
      />
    </div>
  );
};

export default function StoresPage() {
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState("all");

  const stores = mockStores;

  const activeStores = stores.filter((s) => s.status === "active");
  const inactiveStores = stores.filter((s) => s.status === "inactive");

  const handleStoreClick = (store: Store) => {
    console.log("Navigate to store:", store.slug);
  };

  const renderStoreList = (storeList: Store[]) => {
    if (!storeList.length) {
      return <NoStores />;
    }

    return (
      <div className={styles.list}>
        {storeList.map((store) => (
          <StoreItem
            key={store.id}
            store={store}
            onClick={() => handleStoreClick(store)}
          />
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: "all",
      label: `All (${stores.length})`,
      children: renderStoreList(stores),
    },
    {
      key: "active",
      label: `Active (${activeStores.length})`,
      children: renderStoreList(activeStores),
    },
    {
      key: "inactive",
      label: `Inactive (${inactiveStores.length})`,
      children: renderStoreList(inactiveStores),
    },
  ];

  return (
    <SettingsLayout name="stores">
      <div className={styles.tabsWrapper}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </div>
    </SettingsLayout>
  );
}
