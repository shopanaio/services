"use client";

import { useCallback, useMemo, useState } from "react";
import { App, Button, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useDeleteWarehouse } from "../../hooks";
import type { IWarehouseDeleteModalPayload } from "../index";

const useStyles = createStyles(({ token }) => ({
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "4px 0",
  },
  label: {
    color: token.colorTextSecondary,
  },
  warning: {
    display: "block",
    marginTop: 12,
    marginBottom: 16,
    color: token.colorTextSecondary,
  },
  error: {
    display: "block",
    marginTop: 8,
    color: token.colorError,
  },
}));

export function DeleteWarehouseModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IWarehouseDeleteModalPayload;
  const { deleteWarehouse, loading } = useDeleteWarehouse();
  const [confirmation, setConfirmation] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const warehouse = typedPayload.warehouse;
  const requiresConfirmation =
    warehouse.isDefault || warehouse.variantsCount > 0;
  const canSubmit =
    !requiresConfirmation || confirmation.trim() === warehouse.code;

  const handleDelete = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    setApiError(null);
    const { deletedWarehouseId, userErrors } = await deleteWarehouse(
      { id: warehouse.id },
      {
        listQueryVariables: typedPayload.listQueryVariables,
        onCompleted: typedPayload.onDeleted,
      },
    );

    if (userErrors.length > 0) {
      setApiError(userErrors[0].message);
      message.error(userErrors[0].message);
      return;
    }

    if (deletedWarehouseId) {
      message.success("Warehouse deleted");
      pop();
    }
  }, [
    canSubmit,
    deleteWarehouse,
    message,
    pop,
    typedPayload.listQueryVariables,
    typedPayload.onDeleted,
    warehouse.id,
  ]);

  const headerExtra = useMemo(
    () => (
      <Button
        size="small"
        type="primary"
        danger
        loading={loading}
        disabled={!canSubmit}
        onClick={() => {
          void handleDelete();
        }}
        data-testid="delete-warehouse-submit-button"
      >
        Delete
      </Button>
    ),
    [canSubmit, handleDelete, loading],
  );

  return (
    <ModalLayout
      name="warehouse-delete"
      header={
        <ModalHeader
          name="warehouse-delete"
          title="Delete warehouse"
          onClose={pop}
          submitButtonProps={null}
          extra={headerExtra}
        />
      }
    >
      <Paper>
        <PaperHeader title={`Delete "${warehouse.name}"?`} />
        <div className={styles.row}>
          <Typography.Text className={styles.label}>Code</Typography.Text>
          <Typography.Text strong>{warehouse.code}</Typography.Text>
        </div>
        <div className={styles.row}>
          <Typography.Text className={styles.label}>
            Stocked variants
          </Typography.Text>
          <Typography.Text strong>{warehouse.variantsCount}</Typography.Text>
        </div>
        <Typography.Text className={styles.warning}>
          This removes the warehouse and associated warehouse stock records if
          the API allows deletion.
        </Typography.Text>

        {requiresConfirmation && (
          <>
            <Typography.Text strong>
              Type {warehouse.code} to confirm
            </Typography.Text>
            <Input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              status={!canSubmit && confirmation ? "error" : undefined}
              data-testid="delete-warehouse-confirmation-input"
              style={{ marginTop: 8 }}
            />
          </>
        )}

        {apiError && (
          <Typography.Text className={styles.error}>{apiError}</Typography.Text>
        )}
      </Paper>
    </ModalLayout>
  );
}
