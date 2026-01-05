"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Tabs } from "antd";
import {
  AppstoreOutlined,
  DollarOutlined,
  InboxOutlined,
  PictureOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import {
  UnifiedVariantsTable,
  IUnifiedVariantRow,
  getUnifiedDataForSave,
  VariantTabKey,
} from "./UnifiedVariantsTable";
import type { IEditVariantsModalPayload } from "../../modals";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  body: {
    background: token.colorBgContainer,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  tabs: {
    "& .ant-tabs-nav": {
      marginBottom: 0,
    },
  },
  tableContainer: {
    flex: 1,
    overflow: "auto",
  },
}));

// ============================================================================
// Tab Configuration
// ============================================================================

const TAB_CONFIG: Array<{
  key: VariantTabKey;
  label: string;
  icon: React.ReactNode;
}> = [
  { key: "pricing", label: "Pricing", icon: <DollarOutlined /> },
  { key: "inventory", label: "Inventory", icon: <InboxOutlined /> },
  { key: "shipping", label: "Attributes", icon: <AppstoreOutlined /> },
  { key: "media", label: "Media", icon: <PictureOutlined /> },
  { key: "options", label: "Options", icon: <SettingOutlined /> },
];

// ============================================================================
// Main Component
// ============================================================================

export const EditVariantsModal = () => {
  const { styles } = useStyles();
  const { payload, pop, setDirty } = useModalStackContext();
  const typedPayload = payload as IEditVariantsModalPayload;

  const [activeTab, setActiveTab] = useState<VariantTabKey>(
    typedPayload.initialTab || "pricing"
  );
  const rowDataRef = useRef<IUnifiedVariantRow[]>([]);

  const handleChange = useCallback(
    (rows: IUnifiedVariantRow[]) => {
      rowDataRef.current = rows;
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    const dataForSave = getUnifiedDataForSave(rowDataRef.current);
    typedPayload.onSave?.(dataForSave);
    pop();
  }, [typedPayload, pop]);

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as VariantTabKey);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  return (
    <ModalLayout
      name="edit-variants"
      header={
        <ModalHeader
          name="edit-variants"
          title="Edit Variants"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
      fullWidth
      bodyClassName={styles.body}
    >
      <div className={styles.container}>
        <Tabs
          type="editable-card"
          activeKey={activeTab}
          onChange={handleTabChange}
          className={styles.tabs}
          hideAdd
          items={TAB_CONFIG.map((tab) => ({
            key: tab.key,
            closable: false,
            label: (
              <span>
                {tab.icon} {tab.label}
              </span>
            ),
          }))}
        />
        <div className={styles.tableContainer}>
          <UnifiedVariantsTable
            variants={typedPayload.variants}
            activeTab={activeTab}
            onChange={handleChange}
            formatPrice={typedPayload.formatPrice}
            lowStockThreshold={typedPayload.lowStockThreshold}
          />
        </div>
      </div>
    </ModalLayout>
  );
};
