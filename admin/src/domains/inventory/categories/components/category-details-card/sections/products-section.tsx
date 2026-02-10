"use client";

import { useState } from "react";
import { Typography, Flex, Button, Input, Dropdown, Image } from "antd";
import {
  PlusOutlined,
  SortAscendingOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityStatus } from "@/mocks/products/types";
import { useProductsStyles } from "../category-details-card.styles";
import type { ICategoryProduct } from "../types";

// ============================================================================
// Helpers
// ============================================================================

const formatPrice = (price: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
  }).format(price / 100);

const getStockConfig = (inStock: boolean) => {
  if (inStock) {
    return {
      color: "var(--ant-color-success)",
      icon: "\u25CF",
      label: "In Stock",
    };
  }
  return {
    color: "var(--ant-color-error)",
    icon: "\u2715",
    label: "Out of Stock",
  };
};

const getStatusLabel = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.PUBLISHED:
      return "Active";
    case EntityStatus.DRAFT:
      return "Draft";
    case EntityStatus.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
};

// ============================================================================
// ProductRow
// ============================================================================

interface IProductRowProps {
  product: ICategoryProduct;
}

const ProductRow = ({ product }: IProductRowProps) => {
  const { styles } = useProductsStyles();
  const stock = getStockConfig(product.inStock);

  return (
    <tr>
      <td>
        <Flex align="flex-start" gap={8}>
          {product.featured ? (
            <Image
              src={product.featured.url}
              alt={product.title}
              width={40}
              height={40}
              className={styles.productImage}
              preview={false}
            />
          ) : (
            <div className={styles.productImagePlaceholder} />
          )}
          <Flex vertical>
            <Typography.Text strong className={styles.productTitle}>
              {product.title}
            </Typography.Text>
          </Flex>
        </Flex>
      </td>
      <td>
        <Typography.Text className={styles.productSku}>
          {product.sku || "\u2014"}
        </Typography.Text>
      </td>
      <td style={{ textAlign: "right" }}>
        <Typography.Text>{formatPrice(product.price)}</Typography.Text>
      </td>
      <td>
        <Flex align="center" gap={4}>
          <span className={styles.stockIcon} style={{ color: stock.color }}>
            {stock.icon}
          </span>
          <span className={styles.stockLabel} style={{ color: stock.color }}>
            {stock.label}
          </span>
        </Flex>
      </td>
    </tr>
  );
};

// ============================================================================
// ProductsSection
// ============================================================================

interface IProductsSectionProps {
  products: ICategoryProduct[];
  totalCount: number;
  hasNextPage: boolean;
  onAssignProducts?: () => void;
}

export const ProductsSection = ({
  products,
  totalCount,
  hasNextPage,
  onAssignProducts,
}: IProductsSectionProps) => {
  const { styles } = useProductsStyles();
  const [page, setPage] = useState(0);

  const hasProducts = products.length > 0;

  const sortMenu = {
    items: [
      { key: "name-asc", label: "Name A \u2192 Z" },
      { key: "name-desc", label: "Name Z \u2192 A" },
      { type: "divider" as const },
      { key: "price-asc", label: "Price: Low \u2192 High" },
      { key: "price-desc", label: "Price: High \u2192 Low" },
      { type: "divider" as const },
      { key: "stock-asc", label: "Stock: Low \u2192 High" },
      { key: "stock-desc", label: "Stock: High \u2192 Low" },
    ],
    onClick: ({ key }: { key: string }) => console.log("Sort by:", key),
  };

  return (
    <Paper>
      <PaperHeader
        title={`Products (${totalCount})`}
        actions={
          <Flex gap={8} align="center">
            <Input.Search
              placeholder="Search..."
              size="small"
              style={{ width: 200 }}
              onSearch={(value) => console.log("Search:", value)}
            />
            <Dropdown menu={sortMenu} trigger={["click"]}>
              <Button
                size="small"
                icon={<SortAscendingOutlined />}
              />
            </Dropdown>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAssignProducts}
            >
              Assign
            </Button>
          </Flex>
        }
      />

      {hasProducts ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.productsTable}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th style={{ textAlign: "right" }}>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </tbody>
            </table>
          </div>

          <Flex
            justify="space-between"
            align="center"
            className={styles.pagination}
          >
            <Typography.Text
              type="secondary"
              className={styles.paginationCount}
            >
              {totalCount} products
            </Typography.Text>
            <Flex gap={4}>
              <Button
                size="small"
                icon={<LeftOutlined />}
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              />
              <Button
                size="small"
                icon={<RightOutlined />}
                disabled={!hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              />
            </Flex>
          </Flex>
        </>
      ) : (
        <Flex gap={4} wrap="wrap" style={{ padding: "16px 0" }}>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAssignProducts}
          >
            Assign Products
          </Button>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            No products assigned to this category yet
          </Typography.Text>
        </Flex>
      )}
    </Paper>
  );
};
