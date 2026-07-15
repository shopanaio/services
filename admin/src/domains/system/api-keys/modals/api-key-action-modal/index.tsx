"use client";

import { Alert, App, Typography } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useDeleteApiKey, useRevokeApiKey } from "../../hooks";
import type { ApiKeyActionModalPayload } from "../../modals";

export const ApiKeyActionModal = () => {
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as ApiKeyActionModalPayload;
  const deleteMutation = useDeleteApiKey();
  const revokeMutation = useRevokeApiKey();
  const isDelete = typedPayload.action === "delete";
  const activeMutation = isDelete ? deleteMutation : revokeMutation;

  const submit = async () => {
    const result = isDelete
      ? await deleteMutation.deleteApiKey({ id: typedPayload.apiKeyId })
      : await revokeMutation.revokeApiKey({ id: typedPayload.apiKeyId });
    if (!result.data) return;
    await typedPayload.onSaved?.();
    message.success(isDelete ? "API key deleted" : "API key revoked");
    forcePop();
  };

  return (
    <ModalLayout
      name="api-key-action"
      header={
        <ModalHeader
          name="api-key-action"
          onClose={pop}
          submitButtonProps={{
            children: isDelete ? "Delete" : "Revoke",
            danger: true,
            loading: activeMutation.loading,
            onClick: submit,
          }}
          title={isDelete ? "Delete API key" : "Revoke API key"}
        />
      }
    >
      {activeMutation.error ? (
        <Alert message={activeMutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <Typography.Paragraph style={{ margin: 0 }}>
          {isDelete ? "Delete" : "Revoke"}{" "}
          <Typography.Text code>{typedPayload.apiKeyName}</Typography.Text>?
          {isDelete ? " This action cannot be undone." : " The key will stop working immediately."}
        </Typography.Paragraph>
      </Paper>
    </ModalLayout>
  );
};
