"use client";

import { useState, useEffect } from "react";
import { Flex, Skeleton } from "antd";
import { useModalStackContext, ModalLayout } from "@/layouts/modals";
import { BundleDetailsCard } from "../../components/bundle-details-card";
import {
  mockBundleProduct,
  bundleDetailsMockData,
} from "@/mocks/products/bundle-details";

export const BundleModal = () => {
  const { payload, pop, forcePop } = useModalStackContext();
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
      <BundleDetailsCard
        product={mockBundleProduct}
        mockData={bundleDetailsMockData}
      />
    );
  };

  return (
    <ModalLayout
      name="bundle"
      headerProps={{
        title: "Bundle",
        onClose: forcePop,
        submitButtonProps: null,
      }}
    >
      {renderContent()}
    </ModalLayout>
  );
};
