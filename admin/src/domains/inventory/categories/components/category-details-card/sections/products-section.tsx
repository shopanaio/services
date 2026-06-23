"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dropdown,
  Flex,
  Image,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import {
  PlusOutlined,
  ShoppingOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import {
  RelayCursorPagination,
  useRelayCursorPagination,
} from "@/ui-kit/cursor-pagination";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiProduct, ApiProductOrderByInput } from "@/graphql/types";
import { ProductSortBy, SortDirection } from "@/graphql/types";
import { useCategoryProducts } from "../../../hooks";
import { useProductsStyles } from "../category-details-card.styles";

const getProductImageUrl = (product: ApiProduct): string | null => {
  const firstMedia = [...product.media].sort(
    (a, b) => a.sortIndex - b.sortIndex,
  )[0];
  return firstMedia?.file.url ?? null;
};

const formatProductSort = (value: ProductSortBy): string => {
  switch (value) {
    case ProductSortBy.Manual:
      return "Manual";
    case ProductSortBy.Name:
      return "Name";
    case ProductSortBy.Newest:
      return "Newest";
    case ProductSortBy.Price:
      return "Price";
    default:
      return value;
  }
};

const formatSortDirection = (value: SortDirection): string =>
  value === SortDirection.Desc ? "Descending" : "Ascending";

interface ProductRowProps {
  product: ApiProduct;
}

const ProductRow = ({ product }: ProductRowProps) => {
  const { styles } = useProductsStyles();
  const imageUrl = getProductImageUrl(product);

  return (
    <tr data-testid={`category-products-row-${product.handle}`}>
      <td>
        <Flex align="flex-start" gap={8}>
          {imageUrl ? (
            <Image
              src={imageUrl}
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
            <Typography.Text
              strong
              className={styles.productTitle}
              data-testid={`category-products-title-cell-${product.handle}`}
            >
              {product.title}
            </Typography.Text>
          </Flex>
        </Flex>
      </td>
      <td>
        <Typography.Text
          className={styles.productSku}
          data-testid={`category-products-handle-cell-${product.handle}`}
        >
          {product.handle || "-"}
        </Typography.Text>
      </td>
      <td>
        <Tag
          color={product.isPublished ? "green" : "gold"}
          data-testid={`category-products-status-cell-${product.handle}`}
        >
          {product.isPublished ? "Published" : "Draft"}
        </Tag>
      </td>
    </tr>
  );
};

interface ProductsSectionProps {
  categoryId: string;
  productsCount: number;
  defaultSort: ProductSortBy;
  defaultSortDirection: SortDirection;
  onAssignProducts?: () => void;
}

export const ProductsSection = ({
  categoryId,
  productsCount,
  defaultSort,
  defaultSortDirection,
  onAssignProducts,
}: ProductsSectionProps) => {
  const { styles } = useProductsStyles();
  const [orderBy, setOrderBy] = useState<ApiProductOrderByInput[] | null>(null);
  const pagination = useRelayCursorPagination({
    defaultPageSize: 10,
    resetKey: JSON.stringify(orderBy),
  });
  const { products, totalCount, pageInfo, loading, error } =
    useCategoryProducts(categoryId, {
      ...pagination.variables,
      orderBy,
    });

  const sortMenu = useMemo(
    () => ({
      items: [
        {
          key: "manual",
          label: "Manual order",
          onClick: () => setOrderBy([{ field: ProductSortBy.Manual }]),
        },
        {
          key: "name-asc",
          label: "Name A to Z",
          onClick: () =>
            setOrderBy([
              { field: ProductSortBy.Name, direction: SortDirection.Asc },
            ]),
        },
        {
          key: "name-desc",
          label: "Name Z to A",
          onClick: () =>
            setOrderBy([
              { field: ProductSortBy.Name, direction: SortDirection.Desc },
            ]),
        },
        {
          key: "newest",
          label: "Newest first",
          onClick: () =>
            setOrderBy([
              { field: ProductSortBy.Newest, direction: SortDirection.Desc },
            ]),
        },
        {
          key: "price-asc",
          label: "Price low to high",
          onClick: () =>
            setOrderBy([
              { field: ProductSortBy.Price, direction: SortDirection.Asc },
            ]),
        },
        {
          key: "price-desc",
          label: "Price high to low",
          onClick: () =>
            setOrderBy([
              { field: ProductSortBy.Price, direction: SortDirection.Desc },
            ]),
        },
      ],
    }),
    [],
  );

  const hasProducts = products.length > 0;
  const defaultSortLabel = `${formatProductSort(defaultSort)} / ${formatSortDirection(
    defaultSortDirection,
  )}`;

  return (
    <Paper data-testid="category-products-section">
      <PaperHeader
        title={`Products (${productsCount})`}
        extra={
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12 }}
            data-testid="category-products-default-sort"
          >
            Default sort: {defaultSortLabel}
          </Typography.Text>
        }
        actions={
          <Flex gap={8} align="center">
            <Dropdown menu={sortMenu} trigger={["click"]}>
              <Button
                size="small"
                icon={<SortAscendingOutlined />}
                data-testid="category-products-sort-menu-button"
              />
            </Dropdown>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAssignProducts}
              data-testid="category-products-assign-button"
            >
              Assign
            </Button>
          </Flex>
        }
      />

      {error && <Alert type="error" message={error.message} showIcon />}

      {loading && !hasProducts ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : hasProducts ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.productsTable}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Handle</th>
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

          <div className={styles.pagination}>
            <RelayCursorPagination
              name="category-products"
              pagination={pagination}
              pageInfo={pageInfo}
              totalCount={totalCount}
              loadedRowsCount={products.length}
            />
          </div>
        </>
      ) : (
        <EntityDetailsEmptyState
          icon={<ShoppingOutlined />}
          state={{
            title: "No products assigned",
            description: "Assign products to make them appear in this category.",
            actionLabel: "Assign Products",
          }}
          onAction={onAssignProducts}
        />
      )}
    </Paper>
  );
};
