"use client";

import { useMemo } from "react";
import {
  Alert,
  App,
  Button,
  Dropdown,
  Empty,
  Flex,
  List,
  Spin,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { LuEllipsis, LuMail, LuMailPlus } from "react-icons/lu";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";
import {
  SmtpConnectionProvider,
  SmtpConnectionStatus,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  useSmtpConnectionActions,
  useSmtpConnections,
} from "./hooks";
import type { SmtpConnection } from "./graphql/operation-types";
import {
  SMTP_SETTINGS_MODAL_ID,
  type SmtpSettingsModalPayload,
  type SmtpSettingsModalResult,
} from "./modals";

const useStyles = createStyles(({ token }) => ({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: token.padding,
  },
  row: {
    alignItems: "center",
    display: "flex",
    gap: token.paddingSM,
    minWidth: 0,
    width: "100%",
  },
  icon: {
    alignItems: "center",
    background: token.colorFillQuaternary,
    borderRadius: token.borderRadiusLG,
    color: token.colorTextSecondary,
    display: "flex",
    flex: "0 0 auto",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  copy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
  },
  endpoint: {
    color: token.colorTextSecondary,
    fontFamily: token.fontFamilyCode,
    fontSize: token.fontSizeSM,
  },
}));

const providerLabels: Record<SmtpConnectionProvider, string> = {
  [SmtpConnectionProvider.Custom]: "Custom SMTP",
  [SmtpConnectionProvider.Sendgrid]: "SendGrid",
  [SmtpConnectionProvider.MailchimpTransactional]:
    "Mailchimp Transactional",
  [SmtpConnectionProvider.GoogleWorkspace]: "Google Workspace",
};

export default function SmtpAdminPage({ sdk }: AdminAppPageProps) {
  const { styles } = useStyles();
  const { modal } = App.useApp();
  const query = useSmtpConnections(sdk);
  const actions = useSmtpConnectionActions(sdk);
  const connections = useMemo(
    () =>
      [...query.connections].sort(
        (left, right) =>
          Number(left.status !== SmtpConnectionStatus.Active) -
            Number(right.status !== SmtpConnectionStatus.Active) ||
          Number(left.status === SmtpConnectionStatus.Disconnected) -
            Number(right.status === SmtpConnectionStatus.Disconnected),
      ),
    [query.connections],
  );
  const hasActive = connections.some(
    ({ status }) => status === SmtpConnectionStatus.Active,
  );

  const openSettings = async (connection: SmtpConnection | null) => {
    try {
      const result = await sdk.modals.openApp<
        SmtpSettingsModalPayload,
        SmtpSettingsModalResult
      >(SMTP_SETTINGS_MODAL_ID, {
        connection,
        presets: query.presets,
      });
      if (result.status !== "submitted") return;

      if (connection) {
        await actions.updateConnection({
          connectionId: connection.id,
          ...result.data.settings,
        });
        sdk.notifications.success("SMTP connection updated");
      } else {
        await actions.createConnection(result.data.settings);
        sdk.notifications.success("SMTP connection added");
      }
      await query.refetch();
    } catch (error) {
      sdk.notifications.error(
        "Unable to save SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const activate = async (connection: SmtpConnection) => {
    try {
      await actions.activateConnection(connection.id);
      sdk.notifications.success(`${connection.displayName} is now active`);
      await query.refetch();
    } catch (error) {
      sdk.notifications.error(
        "Unable to activate SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const disconnect = (connection: SmtpConnection) => {
    modal.confirm({
      title: `Disconnect ${connection.displayName}?`,
      content:
        "Its stored password or API key will be erased. This action cannot be undone.",
      okButtonProps: { danger: true },
      okText: "Disconnect",
      async onOk() {
        try {
          await actions.disconnectConnection(connection.id);
          sdk.notifications.success("SMTP connection disconnected");
          await query.refetch();
        } catch (error) {
          sdk.notifications.error(
            "Unable to disconnect SMTP connection",
            error instanceof Error ? error.message : undefined,
          );
          throw error;
        }
      },
    });
  };

  return (
    <sdk.ui.AppPage
      description="Configure multiple email providers and choose which connection delivers store email."
      title="SMTP"
    >
      <div className={styles.stack}>
        {query.error ? (
          <Alert message={query.error.message} showIcon type="error" />
        ) : null}
        {!query.loading && connections.length > 0 && !hasActive ? (
          <Alert
            message="No active SMTP connection. Email delivery is paused until you activate one."
            showIcon
            type="warning"
          />
        ) : null}
        <Paper>
          <PaperHeader
            actions={
              <Button
                disabled={query.loading || query.presets.length === 0}
                icon={<LuMailPlus />}
                onClick={() => void openSettings(null)}
                type="primary"
              >
                Add connection
              </Button>
            }
            description="Only one connection is active at a time. The first one is activated automatically."
            title="SMTP configurations"
          />
          <Spin spinning={query.loading}>
            {connections.length === 0 && !query.loading ? (
              <Empty
                description="No SMTP connections configured"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  disabled={query.presets.length === 0}
                  onClick={() => void openSettings(null)}
                  type="primary"
                >
                  Add your first provider
                </Button>
              </Empty>
            ) : (
              <List
                dataSource={connections}
                renderItem={(connection) => {
                  const disconnected =
                    connection.status === SmtpConnectionStatus.Disconnected;
                  const active =
                    connection.status === SmtpConnectionStatus.Active;
                  return (
                    <List.Item>
                      <div className={styles.row}>
                        <div className={styles.icon}>
                          <LuMail aria-hidden size={20} />
                        </div>
                        <div className={styles.copy}>
                          <Flex align="center" gap="small" wrap>
                            <Typography.Text strong ellipsis>
                              {connection.displayName}
                            </Typography.Text>
                            <Tag
                              color={
                                active
                                  ? "success"
                                  : disconnected
                                    ? "default"
                                    : "warning"
                              }
                            >
                              {connection.status.toLowerCase()}
                            </Tag>
                            <Tag>{providerLabels[connection.provider]}</Tag>
                          </Flex>
                          <Typography.Text
                            className={styles.endpoint}
                            ellipsis
                          >
                            {connection.host}:{connection.port} ·{" "}
                            {connection.security}
                            {connection.username
                              ? ` · ${connection.username}`
                              : ""}
                          </Typography.Text>
                        </div>
                        {!active && !disconnected ? (
                          <Button
                            loading={actions.loading}
                            onClick={() => void activate(connection)}
                          >
                            Make active
                          </Button>
                        ) : null}
                        {!disconnected ? (
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: "edit",
                                  label: "Edit",
                                  onClick: () =>
                                    void openSettings(connection),
                                },
                                {
                                  danger: true,
                                  key: "disconnect",
                                  label: "Disconnect",
                                  onClick: () => disconnect(connection),
                                },
                              ],
                            }}
                            trigger={["click"]}
                          >
                            <Button
                              aria-label={`Actions for ${connection.displayName}`}
                              icon={<LuEllipsis />}
                              type="text"
                            />
                          </Dropdown>
                        ) : null}
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Spin>
        </Paper>
      </div>
    </sdk.ui.AppPage>
  );
}
