"use client";

import { useCallback } from "react";
import { Alert, Empty, Flex, Skeleton } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { DiscountDetailsCard } from "../../components/discount-details-card";
import { DiscountStatusTag } from "../../components/discount-details-card/discount-status-tag";
import type { DiscountDetailsSection } from "../../components/discount-details-card/types";
import { useDiscount } from "../../hooks";
import {
  useDiscountGeneralEditModal,
  useDiscountValueTargetsEditModal,
  type IDiscountModalPayload,
} from "../../modals";
import { DiscountKind, DiscountMethod } from "@/graphql/types";
import { useDiscountModalStyles } from "./discount-modal.styles";

export function DiscountModal() {
  const { payload, forcePop } = useModalStackContext();
  const { styles } = useDiscountModalStyles();
  const typedPayload = payload as IDiscountModalPayload;
  const entityId =
    typeof typedPayload.entityId === "string" ? typedPayload.entityId : null;
  const { discount, loading, error, refetch } = useDiscount(entityId);
  const { push: openGeneralSettingsModal } = useDiscountGeneralEditModal();
  const { push: openValueTargetsModal } =
    useDiscountValueTargetsEditModal();

  const editGeneralSettings = useCallback(
    (section: DiscountDetailsSection) => {
      if (!discount) {
        return;
      }

      if (
        section === "summary" ||
        (section === "codes" && discount.method === DiscountMethod.Code)
      ) {
        openGeneralSettingsModal({
          discount,
          onSaved: refetch,
        });
        return;
      }

      if (
        (section === "value-usage" || section === "targets") &&
        discount.kind === DiscountKind.AmountOffProducts
      ) {
        openValueTargetsModal({
          discount,
          onSaved: refetch,
        });
      }
    },
    [
      discount,
      openGeneralSettingsModal,
      openValueTargetsModal,
      refetch,
    ],
  );

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
      <DiscountDetailsCard
        discount={discount}
        editableSections={
          [
            "summary",
            ...(discount.method === DiscountMethod.Code ? ["codes"] : []),
            ...(discount.kind === DiscountKind.AmountOffProducts
              ? ["value-usage", "targets"]
              : []),
          ] as DiscountDetailsSection[]
        }
        onEditSection={editGeneralSettings}
        onRefresh={refetch}
        onArchived={forcePop}
      />
    );
  };

  return (
    <ModalLayout
      name="discount"
      headerProps={{
        title: "Discount details",
        onClose: forcePop,
        submitButtonProps: null,
        extra: discount ? (
          <DiscountStatusTag
            status={discount.effectiveStatus}
            method={discount.method}
            compact
          />
        ) : null,
      }}
      bodyClassName={styles.body}
    >
      {renderContent()}
    </ModalLayout>
  );
}
