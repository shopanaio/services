"use client";

import { Alert, App, Typography } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useDeleteEmailTemplate } from "../../hooks";
import type { DeleteEmailTemplateModalPayload } from "../../modals";

export const DeleteEmailTemplateModal = () => {
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as DeleteEmailTemplateModalPayload;
  const mutation = useDeleteEmailTemplate();

  const submit = async () => {
    const result = await mutation.deleteEmailTemplate({
      id: typedPayload.templateId,
    });
    if (!result.data) return;
    await typedPayload.onSaved?.();
    message.success("Email template deleted");
    forcePop();
  };

  return (
    <ModalLayout
      name="delete-email-template"
      header={
        <ModalHeader
          name="delete-email-template"
          onClose={pop}
          submitButtonProps={{
            children: "Delete",
            danger: true,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="Delete email template"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <Typography.Paragraph style={{ margin: 0 }}>
          Delete <Typography.Text code>{typedPayload.templateLabel}</Typography.Text>{" "}
          template? This action cannot be undone.
        </Typography.Paragraph>
      </Paper>
    </ModalLayout>
  );
};
