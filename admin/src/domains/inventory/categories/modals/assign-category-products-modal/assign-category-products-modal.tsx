"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Image,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useProductPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import type { ApiGenericUserError, ApiProduct } from "@/graphql/types";
import {
  useAddCategoryProduct,
  useCategoryProducts,
  useRemoveCategoryProduct,
} from "../../hooks";
import type { ICategoryAssignProductsModalPayload } from "../../modals";

function productToPickable(product: ApiProduct): IPickableEntity {
  const firstMedia = [...product.media].sort(
    (a, b) => a.sortIndex - b.sortIndex,
  )[0];

  return {
    id: product.id,
    title: product.title,
    image: firstMedia?.file.url ?? null,
    status: product.isPublished ? "published" : "draft",
  };
}

export const AssignCategoryProductsModal = () => {
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICategoryAssignProductsModalPayload;
  const { category, onSaved } = typedPayload;
  const {
    products,
    totalCount,
    loading,
    error,
    refetch,
  } = useCategoryProducts(category.id, { first: 100 });
  const { addCategoryProduct, loading: adding } = useAddCategoryProduct();
  const { removeCategoryProduct, loading: removing } =
    useRemoveCategoryProduct();
  const [initialized, setInitialized] = useState(false);
  const [initialAssignedIds, setInitialAssignedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedById, setSelectedById] = useState<
    Record<string, IPickableEntity>
  >({});

  useEffect(() => {
    if (initialized || loading) return;

    const initialProducts = products.map(productToPickable);
    setInitialAssignedIds(initialProducts.map((product) => product.id));
    setSelectedIds(initialProducts.map((product) => product.id));
    setSelectedById(
      Object.fromEntries(
        initialProducts.map((product) => [product.id, product]),
      ),
    );
    setInitialized(true);
  }, [initialized, loading, products]);

  const selectedProducts = useMemo(
    () =>
      selectedIds.map((id) => selectedById[id] ?? { id, title: id }),
    [selectedById, selectedIds],
  );

  const { openPicker } = useProductPicker({
    selectionMode: "multi",
    excludeIds: selectedIds,
    onConfirm: (entities) => {
      setSelectedById((current) => ({
        ...current,
        ...Object.fromEntries(entities.map((entity) => [entity.id, entity])),
      }));
      setSelectedIds((current) =>
        Array.from(new Set([...current, ...entities.map((entity) => entity.id)])),
      );
    },
  });

  const handleRemoveSelected = (id: string) => {
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
  };

  const handleApply = async () => {
    const initialSet = new Set(initialAssignedIds);
    const selectedSet = new Set(selectedIds);
    const idsToAdd = selectedIds.filter((id) => !initialSet.has(id));
    const idsToRemove = initialAssignedIds.filter((id) => !selectedSet.has(id));
    const userErrors: ApiGenericUserError[] = [];

    for (const productId of idsToAdd) {
      const result = await addCategoryProduct({
        categoryId: category.id,
        productId,
      });
      userErrors.push(...result.userErrors);
    }

    for (const productId of idsToRemove) {
      const result = await removeCategoryProduct({
        categoryId: category.id,
        productId,
      });
      userErrors.push(...result.userErrors);
    }

    await refetch();

    if (userErrors.length > 0) {
      message.error(userErrors[0].message);
      return;
    }

    message.success("Category products updated");
    await onSaved?.();
    pop();
  };

  return (
    <ModalLayout
      name="assign-category-products"
      header={
        <ModalHeader
          name="assign-category-products"
          title="Assign products"
          onClose={pop}
          submitButtonProps={{
            children: "Apply changes",
            onClick: handleApply,
            loading: adding || removing,
            disabled: loading,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader
          title={`Selected products (${selectedIds.length})`}
          extra={
            totalCount > products.length ? (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Showing first {products.length} of {totalCount} assigned
              </Typography.Text>
            ) : null
          }
          actions={
            <Button size="small" icon={<PlusOutlined />} onClick={openPicker}>
              Add products
            </Button>
          }
        />

        {error && <Alert type="error" message={error.message} showIcon />}
        {loading && !initialized ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : selectedProducts.length > 0 ? (
          <Flex vertical gap={8}>
            {selectedProducts.map((product) => (
              <Flex
                key={product.id}
                align="center"
                justify="space-between"
                gap={12}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid var(--ant-color-border-secondary)",
                }}
              >
                <Flex align="center" gap={8}>
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.title}
                      width={40}
                      height={40}
                      preview={false}
                      style={{ objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 4,
                        background: "var(--ant-color-bg-container-disabled)",
                      }}
                    />
                  )}
                  <Flex vertical>
                    <Typography.Text strong>{product.title}</Typography.Text>
                    {product.status && (
                      <Tag color={product.status === "published" ? "green" : "gold"}>
                        {product.status === "published" ? "Published" : "Draft"}
                      </Tag>
                    )}
                  </Flex>
                </Flex>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleRemoveSelected(product.id)}
                />
              </Flex>
            ))}
          </Flex>
        ) : (
          <Empty description="No products selected" />
        )}
      </Paper>
    </ModalLayout>
  );
};
