"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Alert, Flex, Skeleton } from "antd";
import { ModalLayout, useModalStackContext } from "@/layouts/modals";
import { WarehouseDetailsCard } from "../../components/warehouse-details-card";
import { useWarehouse } from "../../hooks";
import {
  useWarehouseDeleteModal,
  useWarehouseEditDefaultModal,
  useWarehouseEditIdentityModal,
  type IWarehouseModalPayload,
} from "../index";

export function WarehouseModal() {
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as IWarehouseModalPayload;
  const { push: openEditIdentityModal } = useWarehouseEditIdentityModal();
  const { push: openEditDefaultModal } = useWarehouseEditDefaultModal();
  const { push: openDeleteModal } = useWarehouseDeleteModal();
  const entityId =
    typedPayload.entityId === undefined || typedPayload.entityId === null
      ? null
      : String(typedPayload.entityId);
  const detailsQueryVariables = useMemo(
    () =>
      entityId
        ? {
            id: entityId,
          }
        : undefined,
    [entityId],
  );

  const { warehouse, loading, error, refetch } = useWarehouse({
    id: entityId,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const handleEditIdentity = useCallback(() => {
    if (!warehouse) {
      return;
    }

    openEditIdentityModal({
      warehouse,
      listQueryVariables: typedPayload.listQueryVariables,
      detailsQueryVariables,
      onUpdated: async () => {
        await refetch();
      },
    });
  }, [
    detailsQueryVariables,
    openEditIdentityModal,
    refetch,
    typedPayload.listQueryVariables,
    warehouse,
  ]);

  const handleEditDefault = useCallback(() => {
    if (!warehouse) {
      return;
    }

    openEditDefaultModal({
      warehouse,
      listQueryVariables: typedPayload.listQueryVariables,
      detailsQueryVariables,
      onUpdated: async () => {
        await refetch();
      },
    });
  }, [
    detailsQueryVariables,
    openEditDefaultModal,
    refetch,
    typedPayload.listQueryVariables,
    warehouse,
  ]);

  const handleDelete = useCallback(() => {
    if (!warehouse) {
      return;
    }

    openDeleteModal({
      warehouse,
      listQueryVariables: typedPayload.listQueryVariables,
      onDeleted: () => {
        forcePop();
      },
    });
  }, [
    forcePop,
    openDeleteModal,
    typedPayload.listQueryVariables,
    warehouse,
  ]);

  const renderContent = () => {
    if (loading) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Flex>
      );
    }

    if (error) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Alert type="error" message={error.message} />
        </Flex>
      );
    }

    if (!warehouse) {
      return (
        <Flex vertical gap={16} style={{ padding: 16 }}>
          <Alert type="warning" message="Warehouse not found" />
        </Flex>
      );
    }

    return (
      <WarehouseDetailsCard
        warehouse={warehouse}
        onEditIdentity={handleEditIdentity}
        onEditDefault={handleEditDefault}
        onDelete={handleDelete}
      />
    );
  };

  return (
    <ModalLayout
      name="warehouse"
      headerProps={{
        title: "Warehouse",
        onClose: forcePop,
        submitButtonProps: null,
      }}
    >
      {renderContent()}
    </ModalLayout>
  );
}
