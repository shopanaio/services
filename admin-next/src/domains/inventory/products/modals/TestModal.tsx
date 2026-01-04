"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Flex, Typography, Skeleton } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";
import { ProductInfoCardA } from "../components/ProductInfoCardA";
import { InventoryVariantsTable, IInventoryVariantRow } from "../components/variants";
import { mockVariableProduct, mockSimpleProduct } from "../mocks/data";
import { useEditVariantInventoryModal } from "../modals";

type ModalTab = "general" | "inventory" | "bundles";

interface ITabConfig {
  key: ModalTab;
  label: string;
}

const TABS: ITabConfig[] = [
  { key: "general", label: "General" },
  { key: "inventory", label: "Inventory" },
  { key: "bundles", label: "Bundles" },
];

const useStyles = createStyles(({ token }) => ({
  header: {
    display: "flex",
    alignItems: "stretch",
    height: 48,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    flexShrink: 0,
  },
  closeSection: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 12px",
    borderRight: `1px solid ${token.colorBorderSecondary}`,
  },
  closeButton: {
    color: token.colorTextSecondary,
    "&:hover": {
      color: token.colorText,
      background: token.colorBgTextHover,
    },
  },
  escBadge: {
    fontSize: 10,
    fontFamily: "inherit",
    padding: "2px 5px",
    background: token.colorBgContainerDisabled,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 4,
    color: token.colorTextSecondary,
  },
  tabButton: {
    height: "100%",
    minWidth: 140,
    borderRadius: 0,
    borderRight: `1px solid ${token.colorBorderSecondary}`,
    transition: "all 0.2s",
  },
  tabButtonActive: {
    fontWeight: 500,
    color: token.colorPrimary,
    background: "transparent !important",
  },
  tabButtonInactive: {
    fontWeight: 400,
    color: token.colorText,
    background: `${token.colorBgLayout} !important`,
    "&:hover": {
      background: `${token.colorBgTextHover} !important`,
    },
  },
  headerRight: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 12px",
  },
  placeholderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 16,
    color: token.colorTextSecondary,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 500,
  },
  placeholderDescription: {
    fontSize: 14,
  },
}));


const BundlesPlaceholder = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.placeholderContainer}>
      <Typography.Text className={styles.placeholderTitle}>
        Product Bundles
      </Typography.Text>
      <Typography.Text type="secondary" className={styles.placeholderDescription}>
        Product groups/bundles management will be rendered here
      </Typography.Text>
    </div>
  );
};

export const TestModal = () => {
  const { styles, cx } = useStyles();
  const { payload, pop, forcePop } = useModalStackContext();
  const [activeTab, setActiveTab] = useState<ModalTab>("general");
  const [loading, setLoading] = useState(true);
  const { push: pushEditInventoryModal } = useEditVariantInventoryModal();

  const product = payload.simple ? mockSimpleProduct : mockVariableProduct;

  // Transform product variants to inventory format
  const inventoryVariants = product.variants.map((v) => ({
    id: v.id,
    title: v.title,
    sku: v.sku,
    stock: Math.floor(Math.random() * 100), // Mock stock
    weight: v.weight,
    weightUnit: v.weightUnit,
    barcode: null,
    options: v.options?.map((opt) => ({
      title: opt.title,
      group: {
        slug: opt.group.slug,
        title: opt.group.title,
      },
    })),
  }));

  const handleEditInventory = useCallback(() => {
    pushEditInventoryModal({
      variants: inventoryVariants,
      lowStockThreshold: 10,
      onSave: (updated: Array<{ id: string; sku: string | null; stock: number; weight: number | null; weightUnit: string; barcode: string | null }>) => {
        console.log("Saved inventory:", updated);
      },
    });
  }, [pushEditInventoryModal, inventoryVariants]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
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

  const renderContent = () => {
    if (loading) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </Flex>
      );
    }

    switch (activeTab) {
      case "general":
        return (
          <ProductInfoCardA
            product={product}
            onEditSection={(section) => console.log("Edit section:", section)}
          />
        );
      case "inventory":
        return (
          <div style={{ padding: 16 }}>
            <InventoryVariantsTable
              variants={inventoryVariants}
              lowStockThreshold={10}
              onEdit={handleEditInventory}
            />
          </div>
        );
      case "bundles":
        return <BundlesPlaceholder />;
      default:
        return null;
    }
  };

  const customHeader = (
    <div className={styles.header}>
      <div className={styles.closeSection}>
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={forcePop}
          className={styles.closeButton}
        />
        <kbd className={styles.escBadge}>esc</kbd>
      </div>

      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Button
            key={tab.key}
            type="text"
            onClick={() => setActiveTab(tab.key)}
            className={cx(
              styles.tabButton,
              isActive ? styles.tabButtonActive : styles.tabButtonInactive
            )}
          >
            {tab.label}
          </Button>
        );
      })}

      <div className={styles.headerRight} />
    </div>
  );

  return (
    <ModalLayout
      name="test"
      header={customHeader}
      fullWidth={activeTab === "inventory"}
    >
      {renderContent()}
    </ModalLayout>
  );
};
