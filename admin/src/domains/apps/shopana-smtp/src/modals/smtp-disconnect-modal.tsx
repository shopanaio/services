"use client";

import { useState } from "react";
import { Alert, Button, Input, List, Typography } from "antd";
import { createStyles } from "antd-style";
import type { AdminAppModalProps } from "@shopana/admin-app-sdk";
import { Paper } from "@/ui-kit/paper";
import { useSmtpConnectionActions } from "../hooks";
import type { SmtpDisconnectModalPayload, SmtpDisconnectModalResult } from ".";

const useStyles = createStyles(({ token }) => ({
  warningList: {
    marginBottom: token.marginMD,
  },
  label: {
    display: "block",
    fontWeight: 500,
    marginBottom: token.marginXS,
  },
  confirmText: {
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadiusSM,
    fontFamily: "monospace",
    padding: "2px 6px",
  },
}));

export default function SmtpDisconnectModal({
  sdk,
  payload,
}: AdminAppModalProps<SmtpDisconnectModalPayload>) {
  const { styles } = useStyles();
  const actions = useSmtpConnectionActions(sdk);
  const [confirmation, setConfirmation] = useState("");
  const confirmationText = `disconnect ${payload.displayName}`;
  const isConfirmed = confirmation === confirmationText;

  const submit = async () => {
    if (!isConfirmed || actions.loading) return;

    try {
      await actions.disconnectConnection(payload.connectionId);
      sdk.modals.closeCurrent<SmtpDisconnectModalResult>({
        connectionId: payload.connectionId,
      });
    } catch (error) {
      sdk.notifications.error(
        "Unable to disconnect SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const consequences = [
    "Erase the stored password or API key",
    "Permanently disable this SMTP connection",
    "Stop email delivery if this is the active connection",
  ];

  return (
    <sdk.ui.ModalLayout
      actions={
        <Button
          danger
          disabled={!isConfirmed}
          loading={actions.loading}
          size="small"
          type="primary"
          onClick={() => void submit()}
        >
          Disconnect connection
        </Button>
      }
      title="Disconnect SMTP connection"
    >
      <Paper>
        <Alert
          showIcon
          message="This action is permanent and cannot be undone"
          style={{ marginBottom: 16 }}
          type="error"
        />

        <Typography.Paragraph>
          Disconnecting <strong>&quot;{payload.displayName}&quot;</strong> will:
        </Typography.Paragraph>

        <List
          className={styles.warningList}
          dataSource={consequences}
          size="small"
          renderItem={(item) => (
            <List.Item>
              <Typography.Text type="danger">• {item}</Typography.Text>
            </List.Item>
          )}
        />

        <Typography.Text className={styles.label}>
          Type <span className={styles.confirmText}>{confirmationText}</span> to confirm
        </Typography.Text>
        <Input
          autoFocus
          placeholder={confirmationText}
          status={confirmation && !isConfirmed ? "error" : undefined}
          value={confirmation}
          onChange={({ target }) => setConfirmation(target.value)}
          onPressEnter={() => void submit()}
        />
      </Paper>
    </sdk.ui.ModalLayout>
  );
}
