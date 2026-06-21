"use client";

import { useCallback, useState } from "react";
import { App, Alert, Checkbox, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateWarehouse } from "../../hooks";
import type { IWarehouseEditDefaultModalPayload } from "../index";

const useStyles = createStyles(({ token }) => ({
  help: {
    display: "block",
    marginTop: 8,
    color: token.colorTextSecondary,
    fontSize: 12,
  },
}));

export function EditDefaultModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IWarehouseEditDefaultModalPayload;
  const [checked, setChecked] = useState(true);
  const { updateWarehouse, loading } = useUpdateWarehouse();
  const isAlreadyDefault = typedPayload.warehouse.isDefault;

  const handleSubmit = useCallback(async () => {
    if (isAlreadyDefault || !checked) {
      return;
    }

    const { warehouse, userErrors } = await updateWarehouse(
      {
        id: typedPayload.warehouse.id,
        isDefault: true,
      },
      {
        listQueryVariables: typedPayload.listQueryVariables,
        detailsQueryVariables: typedPayload.detailsQueryVariables,
        onCompleted: typedPayload.onUpdated,
      },
    );

    if (userErrors.length > 0) {
      message.error(userErrors[0].message);
      return;
    }

    if (warehouse) {
      message.success("Default warehouse updated");
      pop();
    }
  }, [
    checked,
    isAlreadyDefault,
    message,
    pop,
    typedPayload,
    updateWarehouse,
  ]);

  return (
    <ModalLayout
      name="warehouse-edit-default"
      header={
        <ModalHeader
          name="warehouse-edit-default"
          title="Set default warehouse"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit,
            loading,
            disabled: isAlreadyDefault || !checked,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Default behavior" />
        <Alert
          type={isAlreadyDefault ? "info" : "warning"}
          showIcon
          message={
            isAlreadyDefault
              ? "This warehouse is already the default."
              : "Only one warehouse can be default for a store."
          }
          style={{ marginBottom: 16 }}
        />
        <Checkbox
          checked={isAlreadyDefault || checked}
          disabled={isAlreadyDefault}
          onChange={(event) => setChecked(event.target.checked)}
          data-testid="edit-warehouse-default-checkbox"
        >
          Make &quot;{typedPayload.warehouse.name}&quot; the default warehouse
        </Checkbox>
        <Typography.Text className={styles.help}>
          Current default will be replaced after saving.
        </Typography.Text>
      </Paper>
    </ModalLayout>
  );
}
