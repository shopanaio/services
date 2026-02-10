"use client";

import { useState, useEffect } from "react";
import { Flex, Skeleton } from "antd";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";
import {
  CategoryDetailsCard,
  mockCategory,
  mockCategoryDetailsData,
} from "../../components/category-details-card";

export const CategoryModal = () => {
  const { pop, forcePop } = useModalStackContext();
  const [loading, setLoading] = useState(true);

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
        </Flex>
      );
    }

    return (
      <CategoryDetailsCard
        category={mockCategory}
        mockData={mockCategoryDetailsData}
        onEditSection={(section) => console.log("Edit section:", section)}
      />
    );
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
