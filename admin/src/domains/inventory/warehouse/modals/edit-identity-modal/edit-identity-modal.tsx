"use client";

import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { App, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateWarehouse } from "../../hooks";
import {
  mapUpdateWarehouseIdentityFormToInput,
  mapWarehouseUserErrorsToFormErrors,
  normalizeWarehouseCode,
} from "../../mappers";
import type { IWarehouseEditIdentityModalPayload } from "../index";
import { editWarehouseIdentitySchema } from "./schema";
import type { EditWarehouseIdentityFormValues } from "./types";

const useStyles = createStyles(({ token }) => ({
  fieldGroup: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
    "@media (max-width: 720px)": {
      flexDirection: "column",
    },
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    display: "block",
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
  },
  error: {
    display: "block",
    marginTop: 4,
    color: token.colorError,
    fontSize: 12,
  },
  help: {
    display: "block",
    marginTop: 6,
    color: token.colorTextSecondary,
    fontSize: 12,
  },
}));

export function EditIdentityModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IWarehouseEditIdentityModalPayload;
  const { updateWarehouse, loading } = useUpdateWarehouse();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditWarehouseIdentityFormValues>({
    resolver: zodResolver(editWarehouseIdentitySchema),
    defaultValues: {
      name: typedPayload.warehouse.name,
      code: typedPayload.warehouse.code,
    },
  });

  const onSubmit = useCallback(
    async (values: EditWarehouseIdentityFormValues) => {
      const { warehouse, userErrors } = await updateWarehouse(
        mapUpdateWarehouseIdentityFormToInput({
          id: typedPayload.warehouse.id,
          ...values,
        }),
        {
          listQueryVariables: typedPayload.listQueryVariables,
          detailsQueryVariables: typedPayload.detailsQueryVariables,
          onCompleted: typedPayload.onUpdated,
        },
      );

      if (userErrors.length > 0) {
        mapWarehouseUserErrorsToFormErrors(userErrors).forEach((error) => {
          if (error.field !== "name" && error.field !== "code") {
            return;
          }

          setError(error.field, { message: error.message });
        });

        message.error(userErrors[0].message);
        return;
      }

      if (warehouse) {
        message.success("Warehouse identity updated");
        pop();
      }
    },
    [
      message,
      pop,
      setError,
      typedPayload,
      updateWarehouse,
    ],
  );

  return (
    <ModalLayout
      name="warehouse-edit-identity"
      header={
        <ModalHeader
          name="warehouse-edit-identity"
          title="Edit warehouse identity"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            loading,
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="General" />
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <Typography.Text className={styles.label}>Name</Typography.Text>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  autoFocus
                  status={errors.name ? "error" : undefined}
                  data-testid="edit-warehouse-name-input"
                />
              )}
            />
            {errors.name && (
              <Typography.Text className={styles.error}>
                {errors.name.message}
              </Typography.Text>
            )}
          </div>

          <div className={styles.field}>
            <Typography.Text className={styles.label}>Code</Typography.Text>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  status={errors.code ? "error" : undefined}
                  data-testid="edit-warehouse-code-input"
                  onChange={(event) =>
                    field.onChange(normalizeWarehouseCode(event.target.value))
                  }
                />
              )}
            />
            {errors.code ? (
              <Typography.Text className={styles.error}>
                {errors.code.message}
              </Typography.Text>
            ) : (
              <Typography.Text className={styles.help}>
                Changing the code can affect imports, reports, and integrations.
              </Typography.Text>
            )}
          </div>
        </div>
      </Paper>
    </ModalLayout>
  );
}
