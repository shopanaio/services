"use client";

import { useState, useEffect } from "react";
import { Flex, Skeleton } from "antd";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";
import {
  ProductDetailsCard,
  productDetailsMockData,
} from "../../components/product-details-card";
import { mockVariableProduct, mockSimpleProduct } from "../../mocks/data";

export const ProductModal = () => {
  const { payload, pop, forcePop } = useModalStackContext();
  const [loading, setLoading] = useState(true);

  const product = payload.simple ? mockSimpleProduct : mockVariableProduct;

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
      <ProductDetailsCard
        product={product}
        mockData={productDetailsMockData}
        onEditSection={(section) => console.log("Edit section:", section)}
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
