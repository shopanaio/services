"use client";

import { useState } from "react";
import { Typography, Button, Tabs, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useStyles } from "../../organization-page.styles";
import type { IStoresSectionProps, IStore } from "../../types";
import { StoreItem } from "../store-item";

export function StoresSection({ stores, onStoreClick, onCreateStore }: IStoresSectionProps) {
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState("all");

  const activeStores = stores.filter((s) => s.status === "active");
  const inactiveStores = stores.filter((s) => s.status === "inactive");

  const renderStoreList = (storeList: IStore[]) => {
    if (!storeList.length) {
      return (
        <div className={styles.emptyState}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Typography.Text type="secondary">
                No stores found
              </Typography.Text>
            }
          />
        </div>
      );
    }

    return (
      <div className={styles.storeList}>
        {storeList.map((store) => (
          <StoreItem
            key={store.id}
            store={store}
            onClick={() => onStoreClick(store)}
          />
        ))}
      </div>
    );
  };

  const tabItems = [
    { key: "all", label: `All (${stores.length})`, children: renderStoreList(stores) },
    { key: "active", label: `Active (${activeStores.length})`, children: renderStoreList(activeStores) },
    { key: "inactive", label: `Inactive (${inactiveStores.length})`, children: renderStoreList(inactiveStores) },
  ];

  return (
    <Paper>
      <PaperHeader
        title="Stores"
        actions={
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={onCreateStore}
          >
            Create Store
          </Button>
        }
      />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Paper>
  );
}
