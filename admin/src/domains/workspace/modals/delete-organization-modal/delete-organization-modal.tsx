"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Input, Typography, Alert, List, App } from "antd";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { IDeleteOrganizationModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
  },
  warningList: {
    marginBottom: token.marginMD,
  },
  confirmText: {
    fontFamily: "monospace",
    backgroundColor: token.colorBgLayout,
    padding: "2px 6px",
    borderRadius: token.borderRadiusSM,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXS,
  },
}));

interface IDeleteForm {
  confirmation: string;
}

export const DeleteOrganizationModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IDeleteOrganizationModalPayload;
  const { organizationName, organizationSlug } = typedPayload;

  const confirmationText = `delete ${organizationSlug}`;

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IDeleteForm>({
    defaultValues: {
      confirmation: "",
    },
  });

  const confirmationValue = watch("confirmation");
  const isConfirmed = confirmationValue === confirmationText;

  const onSubmit = () => {
    if (!isConfirmed) return;
    typedPayload.onDelete?.();
    message.success("Organization deleted");
    pop();
  };

  const consequences = [
    "Remove all team members",
    "Delete all stores and their data",
    "Cancel all active subscriptions",
    "Remove all products, orders, and inventory",
  ];

  return (
    <ModalLayout
      name="delete-organization"
      header={
        <ModalHeader
          name="delete-organization"
          title="Delete Organization"
          onClose={pop}
          submitButtonProps={{
            onClick: handleSubmit(onSubmit),
            danger: true,
            disabled: !isConfirmed,
            children: "Delete Organization",
          }}
        />
      }
    >
      <Paper>
        <Alert
          type="error"
          message="DANGER: This action is permanent and irreversible"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Typography.Paragraph>
          Deleting <strong>"{organizationName}"</strong> will:
        </Typography.Paragraph>

        <List
          className={styles.warningList}
          size="small"
          dataSource={consequences}
          renderItem={(item) => (
            <List.Item>
              <Typography.Text type="danger">• {item}</Typography.Text>
            </List.Item>
          )}
        />

        <div className={styles.formItem}>
          <Typography.Text className={styles.label}>
            Type{" "}
            <span className={styles.confirmText}>{confirmationText}</span> to
            confirm
          </Typography.Text>
          <Controller
            name="confirmation"
            control={control}
            rules={{
              validate: (value) =>
                value === confirmationText || "Please type the confirmation text",
            }}
            render={({ field }) => (
              <Input
                {...field}
                placeholder={confirmationText}
                status={
                  confirmationValue && !isConfirmed ? "error" : undefined
                }
              />
            )}
          />
          {errors.confirmation && (
            <Typography.Text className={styles.error}>
              {errors.confirmation.message}
            </Typography.Text>
          )}
        </div>
      </Paper>
    </ModalLayout>
  );
};
