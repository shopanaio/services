"use client";

import { useEffect } from "react";
import { Alert, Empty, Flex, Skeleton } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { DiscountDetailsCard } from "../../components/discount-details-card";
import { useDiscount } from "../../hooks";
import type { IDiscountModalPayload } from "../../modals";
import { useDiscountModalStyles } from "./discount-modal.styles";

export function DiscountModal() {
  const { payload, pop, forcePop } = useModalStackContext();
  const { styles } = useDiscountModalStyles();
  const typedPayload = payload as IDiscountModalPayload;
  const entityId =
    typeof typedPayload.entityId === "string" ? typedPayload.entityId : null;
  const { discount, loading, error, refetch } = useDiscount(entityId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        pop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const renderContent = () => {
    if (loading && !discount) {
      return (
        <div className={styles.state}>
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.state}>
          <Alert type="error" message={error.message} showIcon />
        </div>
      );
    }

    if (!discount) {
      return (
        <Flex className={styles.state} align="center" justify="center">
          <Empty description="Discount not found" />
        </Flex>
      );
    }

    return (
      <div className={styles.content}>
        <DiscountDetailsCard discount={discount} onRefresh={refetch} />
      </div>
    );
  };

  return (
    <ModalLayout
      name="discount"
      headerProps={{
        title: "Discount details",
        onClose: forcePop,
        submitButtonProps: null,
      }}
    >
      <div className={styles.body}>{renderContent()}</div>
    </ModalLayout>
  );
}
