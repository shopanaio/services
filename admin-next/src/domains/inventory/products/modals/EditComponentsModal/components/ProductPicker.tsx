"use client";

import { useState, useMemo, useCallback } from "react";
import { createStyles } from "antd-style";
import {
  Modal,
  Input,
  List,
  Checkbox,
  Typography,
  Tag,
  Empty,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";

import { ComponentItemType, ComponentPriceType } from "../types";
import type { IComponentItem } from "../types";
import { mockProducts, formatPrice } from "../mocks/mockData";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  searchWrapper: {
    marginBottom: 16,
  },
  listItem: {
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      background: token.colorBgLayout,
    },
  },
  listItemSelected: {
    background: token.colorPrimaryBg,
    "&:hover": {
      background: token.colorPrimaryBg,
    },
  },
  productRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "8px 0",
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    objectFit: "cover",
    background: token.colorBgLayout,
    flexShrink: 0,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 2,
  },
  productMeta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  productSku: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: 500,
    marginLeft: "auto",
    flexShrink: 0,
  },
  footer: {
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    paddingTop: 12,
    marginTop: 12,
  },
  selectedCount: {
    color: token.colorTextSecondary,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IProductPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: IComponentItem[]) => void;
  excludeProductIds?: string[];
}

// ============================================================================
// Component
// ============================================================================

export const ProductPicker = ({
  open,
  onClose,
  onSelect,
  excludeProductIds = [],
}: IProductPickerProps) => {
  const { styles, cx } = useStyles();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      // Exclude already added products
      if (excludeProductIds.includes(product.id)) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          product.title.toLowerCase().includes(searchLower) ||
          product.sku.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [search, excludeProductIds]);

  // Toggle selection
  const handleToggle = useCallback((productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }, []);

  // Create component items from selected products
  const handleConfirm = useCallback(() => {
    const items: IComponentItem[] = selectedIds.map((productId, index) => {
      const product = mockProducts.find((p) => p.id === productId)!;

      return {
        id: `item-${Date.now()}-${index}`,
        itemType: product.hasVariants
          ? ComponentItemType.PRODUCT_WITH_VARIANTS
          : ComponentItemType.SIMPLE_PRODUCT,
        productId: product.id,
        priceType: ComponentPriceType.BASE,
        priceValue: null,
        basePrice: product.price,
        basePriceMax: product.priceMax,
        finalPrice: product.price,
        finalPriceMax: product.priceMax,
        sortIndex: 0,
        isAvailable: product.stock > 0,
        totalStock: product.stock,
        availableVariantIds: product.hasVariants
          ? product.variants?.map((v) => v.id)
          : undefined,
      };
    });

    onSelect(items);
    setSelectedIds([]);
    setSearch("");
    onClose();
  }, [selectedIds, onSelect, onClose]);

  // Reset on close
  const handleCancel = useCallback(() => {
    setSelectedIds([]);
    setSearch("");
    onClose();
  }, [onClose]);

  return (
    <Modal
      title="Add Products"
      open={open}
      onCancel={handleCancel}
      onOk={handleConfirm}
      okText={`Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
      okButtonProps={{ disabled: selectedIds.length === 0 }}
      width={500}
      destroyOnClose
    >
      {/* Search */}
      <div className={styles.searchWrapper}>
        <Input
          placeholder="Search products..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={search ? "No products found" : "No products available"}
        />
      ) : (
        <List
          dataSource={filteredProducts}
          style={{ maxHeight: 400, overflow: "auto" }}
          renderItem={(product) => {
            const isSelected = selectedIds.includes(product.id);
            const priceDisplay = product.priceMax
              ? `${formatPrice(product.price)} - ${formatPrice(product.priceMax)}`
              : formatPrice(product.price);

            return (
              <List.Item
                className={cx(
                  styles.listItem,
                  isSelected && styles.listItemSelected
                )}
                onClick={() => handleToggle(product.id)}
              >
                <div className={styles.productRow}>
                  <Checkbox checked={isSelected} />
                  <img
                    src={product.imageUrl || "/placeholder.png"}
                    alt=""
                    className={styles.productImage}
                  />
                  <div className={styles.productInfo}>
                    <Typography.Text className={styles.productTitle}>
                      {product.title}
                    </Typography.Text>
                    <div className={styles.productMeta}>
                      <Typography.Text className={styles.productSku}>
                        {product.sku}
                      </Typography.Text>
                      {product.hasVariants && (
                        <Tag color="blue" style={{ marginLeft: 4 }}>
                          {product.variants?.length} variants
                        </Tag>
                      )}
                      {product.stock === 0 && (
                        <Tag color="red">Out of stock</Tag>
                      )}
                    </div>
                  </div>
                  <Typography.Text className={styles.productPrice}>
                    {priceDisplay}
                  </Typography.Text>
                </div>
              </List.Item>
            );
          }}
        />
      )}

      {/* Selected count */}
      {selectedIds.length > 0 && (
        <div className={styles.footer}>
          <Typography.Text className={styles.selectedCount}>
            {selectedIds.length} product{selectedIds.length > 1 ? "s" : ""} selected
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
};

export default ProductPicker;
