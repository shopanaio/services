"use client";

import { useEffect } from "react";
import { Alert, Empty, Flex, Skeleton } from "antd";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";
import { CategoryDetailsCard } from "../../components/category-details-card";
import { useCategory } from "../../hooks";
import type { ICategoryModalPayload } from "../../modals";

export const CategoryModal = () => {
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as ICategoryModalPayload;
  const categoryId =
    typeof typedPayload.entityId === "string" ? typedPayload.entityId : null;
  const { category, loading, error, refetch } = useCategory(categoryId);

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
    if (loading && !category) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Flex>
      );
    }

    if (error) {
      return <Alert type="error" message={error.message} showIcon />;
    }

    if (!category) {
      return (
        <Flex align="center" justify="center" style={{ padding: 24 }}>
          <Empty description="Category not found" />
        </Flex>
      );
    }

    return <CategoryDetailsCard category={category} onRefetch={refetch} />;
  };

  return (
    <ModalLayout
      name="category"
      headerProps={{
        title: "Category",
        onClose: forcePop,
        submitButtonProps: null,
      }}
    >
      {renderContent()}
    </ModalLayout>
  );
};
