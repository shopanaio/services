"use client";

import { useMemo, useState, useEffect } from "react";
import { Alert, Flex, Skeleton } from "antd";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";
import { ProductDetailsCard } from "../../components/product-details-card/product-details-card";
import { productDetailsMockData } from "../../components/product-details-card/supplemental-data";
import { useProduct } from "../../hooks";

const VARIANTS_PAGE_SIZE = 10;

export const ProductModal = () => {
  const { payload, pop, forcePop } = useModalStackContext();
  const [variantsPageIndex, setVariantsPageIndex] = useState(0);
  const [variantCursorHistory, setVariantCursorHistory] = useState<
    Array<string | null>
  >([null]);
  const [paginationEntityId, setPaginationEntityId] = useState<string | null>(
    null,
  );
  const entityId =
    payload.entityId === undefined || payload.entityId === null
      ? null
      : String(payload.entityId);

  const variantsAfter =
    paginationEntityId === entityId
      ? variantCursorHistory[variantsPageIndex] ?? null
      : null;
  const { product, loading, error, refetch } = useProduct({
    id: entityId,
    variantsFirst: VARIANTS_PAGE_SIZE,
    variantsAfter,
  });
  const isVariantsPageLoading = loading && !!product;

  const handleVariantsPageChange = (direction: "next" | "prev") => {
    if (!product || isVariantsPageLoading) {
      return;
    }

    if (direction === "next") {
      const endCursor = product.variants.pageInfo.endCursor;

      if (!endCursor) {
        return;
      }

      setVariantCursorHistory((current) => {
        const next = current.slice(0, variantsPageIndex + 1);
        next[variantsPageIndex + 1] = endCursor;
        return next;
      });
      setVariantsPageIndex((current) => current + 1);
      return;
    }

    setVariantsPageIndex((current) => Math.max(0, current - 1));
  };

  const variantsTableData = useMemo(() => {
    if (!product) {
      return undefined;
    }

    return {
      variants: product.variants.edges.map((edge) => edge.node),
      pageInfo: product.variants.pageInfo,
      totalCount: product.variants.totalCount,
    };
  }, [product]);

  useEffect(() => {
    setPaginationEntityId(entityId);
    setVariantsPageIndex(0);
    setVariantCursorHistory([null]);
  }, [entityId]);

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
    if (loading && !product) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Flex>
      );
    }

    if (error && !product) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Alert type="error" message={error.message} />
        </Flex>
      );
    }

    if (!product) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Alert type="warning" message="Product not found" />
        </Flex>
      );
    }

    return (
      <ProductDetailsCard
        product={product}
        supplementalData={productDetailsMockData}
        variantsTableData={variantsTableData}
        onVariantsPageChange={handleVariantsPageChange}
        isVariantsPageLoading={isVariantsPageLoading}
        onProductRefresh={refetch}
      />
    );
  };

  return (
    <ModalLayout
      name="product"
      headerProps={{
        title: "Product",
        onClose: forcePop,
        submitButtonProps: null,
      }}
    >
      {renderContent()}
    </ModalLayout>
  );
};
