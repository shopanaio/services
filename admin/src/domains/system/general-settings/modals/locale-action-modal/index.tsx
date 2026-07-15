"use client";

import { Alert, App, Typography } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useDeleteLocale, useSetDefaultLocale } from "../../hooks";
import type { LocaleActionModalPayload } from "../../modals";

export const LocaleActionModal = () => {
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as LocaleActionModalPayload;
  const deleteMutation = useDeleteLocale();
  const defaultMutation = useSetDefaultLocale();
  const isDelete = typedPayload.action === "delete";
  const activeMutation = isDelete ? deleteMutation : defaultMutation;

  const submit = async () => {
    const result = isDelete
      ? await deleteMutation.deleteLocale({ code: typedPayload.localeCode })
      : await defaultMutation.setDefaultLocale({
          locale: typedPayload.localeCode,
        });

    if (!result.data) return;
    await typedPayload.onSaved?.();
    message.success(
      isDelete ? "Language deleted" : "Default language updated",
    );
    forcePop();
  };

  return (
    <ModalLayout
      name="locale-action"
      header={
        <ModalHeader
          name="locale-action"
          onClose={pop}
          submitButtonProps={{
            children: isDelete ? "Delete" : "Confirm",
            danger: isDelete,
            loading: activeMutation.loading,
            onClick: submit,
          }}
          title={isDelete ? "Delete language" : "Set default language"}
        />
      }
    >
      {activeMutation.error ? (
        <Alert message={activeMutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <Typography.Paragraph style={{ margin: 0 }}>
          {isDelete ? (
            <>
              Delete <Typography.Text code>{typedPayload.localeName}</Typography.Text>{" "}
              from the store languages?
            </>
          ) : (
            <>
              Set <Typography.Text code>{typedPayload.localeName}</Typography.Text>{" "}
              as the default store language?
            </>
          )}
        </Typography.Paragraph>
      </Paper>
    </ModalLayout>
  );
};
