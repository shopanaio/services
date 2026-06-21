"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const STOCK_PAGE_SIZE = 10;

export function WarehouseModal() {
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as IWarehouseModalPayload;
  const [stockPageIndex, setStockPageIndex] = useState(0);
  const [stockCursorHistory, setStockCursorHistory] = useState<
    Array<string | null>
  >([null]);
  const { push: openEditIdentityModal } = useWarehouseEditIdentityModal();
  const { push: openEditDefaultModal } = useWarehouseEditDefaultModal();
  const { push: openDeleteModal } = useWarehouseDeleteModal();
  const entityId =
    typedPayload.entityId === undefined || typedPayload.entityId === null
      ? null
      : String(typedPayload.entityId);
  const stockAfter = stockCursorHistory[stockPageIndex] ?? null;
  const detailsQueryVariables = useMemo(
    () =>
      entityId
        ? {
            id: entityId,
            stockFirst: STOCK_PAGE_SIZE,
            stockAfter,
          }
        : undefined,
    [entityId, stockAfter],
  );

  const { warehouse, loading, error, refetch } = useWarehouse({
    id: entityId,
    stockFirst: STOCK_PAGE_SIZE,
    stockAfter,
  });

  useEffect(() => {
    setStockPageIndex(0);
    setStockCursorHistory([null]);
  }, [entityId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        pop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pop]);

  const handleStockPageChange = useCallback(
    (direction: "next" | "prev") => {
      if (!warehouse) {
        return;
      }

      if (direction === "next") {
        const endCursor = warehouse.stock.pageInfo.endCursor;

        if (!endCursor) {
          return;
        }

        setStockCursorHistory((current) => {
          const next = current.slice(0, stockPageIndex + 1);
          next[stockPageIndex + 1] = endCursor;
          return next;
        });
        setStockPageIndex((current) => current + 1);
        return;
      }

      setStockPageIndex((current) => Math.max(0, current - 1));
    },
    [stockPageIndex, warehouse],
  );

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
        onStockPageChange={handleStockPageChange}
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
