"use client";

import { Alert, App, Typography } from "antd";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useUninstallApp } from "../../hooks";
import type { UninstallAppModalPayload } from "../../modals";

export const UninstallAppModal = () => {
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as UninstallAppModalPayload;
  const mutation = useUninstallApp();

  const submit = async () => {
    const result = await mutation.uninstallApp({ code: typedPayload.appCode });
    if (!result.data) return;
    await typedPayload.onSaved?.();
    message.success("App uninstalled");
    forcePop();
  };

  return (
    <ModalLayout
      name="uninstall-app"
      header={
        <ModalHeader
          name="uninstall-app"
          onClose={pop}
          submitButtonProps={{
            children: "Uninstall",
            danger: true,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="Uninstall app"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <Typography.Paragraph style={{ margin: 0 }}>
          Uninstall <Typography.Text code>{typedPayload.appName}</Typography.Text>?
        </Typography.Paragraph>
      </Paper>
    </ModalLayout>
  );
};
