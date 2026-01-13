"use client";

import { useState, useMemo } from "react";
import { Typography, Button, Tabs, Empty, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { StoreStatus, type ApiStore } from "@/graphql/types";
import { useStyles } from "../../organization-page.styles";
import type { StoresSectionProps } from "../../types";
import { StoreItem } from "../store-item";

export function StoresSection({
  stores,
  loading = false,
  onStoreClick,
  onCreateStore,
}: StoresSectionProps) {
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState("all");

  const activeStores = useMemo(
    () => stores.filter((s) => s.status === StoreStatus.Active),
    [stores]
  );
  const inactiveStores = useMemo(
    () => stores.filter((s) => s.status === StoreStatus.Inactive),
    [stores]
  );

  const renderStoreList = (storeList: ApiStore[]) => {
    if (loading) {
      return (
        <div className={styles.storeList}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} active paragraph={{ rows: 1 }} />
          ))}
        </div>
      );
    }

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
    {
      key: "all",
      label: `All${loading ? "" : ` (${stores.length})`}`,
      children: renderStoreList(stores),
    },
    {
      key: "active",
      label: `Active${loading ? "" : ` (${activeStores.length})`}`,
      children: renderStoreList(activeStores),
    },
    {
      key: "inactive",
      label: `Inactive${loading ? "" : ` (${inactiveStores.length})`}`,
      children: renderStoreList(inactiveStores),
    },
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
            loading={loading}
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
