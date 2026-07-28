"use client";

import { useMemo } from "react";
import {
  Alert,
  Button,
  Divider,
  Dropdown,
  Empty,
  Flex,
  List,
  Spin,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { LuEllipsis } from "react-icons/lu";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";
import { SmtpConnectionStatus } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  SmtpSettingsForm,
  type SmtpSettings,
} from "./components/smtp-settings-form";
import {
  useSmtpConnection,
  useSmtpConnectionActions,
  useSmtpConnections,
} from "./hooks";
import type { SmtpConnection } from "./graphql/operation-types";
import {
  CREATE_SMTP_CONNECTION_MODAL_ID,
  SMTP_DISCONNECT_MODAL_ID,
  type CreateSmtpConnectionModalPayload,
  type CreateSmtpConnectionModalResult,
  type SmtpDisconnectModalPayload,
  type SmtpDisconnectModalResult,
} from "./modals";

const useStyles = createStyles(({ token }) => ({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: token.padding,
  },
  connectionRow: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: token.paddingSM,
    minWidth: 0,
    width: "100%",
  },
  connectionRowDisabled: {
    cursor: "not-allowed",
    opacity: 0.5,
  },
  connectionCopy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
  },
  connectionStatus: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  dangerRow: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  dangerDivider: {
    margin: `${token.marginSM}px 0`,
  },
}));

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const statusPresentation = {
  [SmtpConnectionStatus.Active]: {
    color: "success",
    description: "This connection delivers the store's outgoing email.",
    label: "Active",
  },
  [SmtpConnectionStatus.Inactive]: {
    color: "warning",
    description:
      "This connection is configured but is not currently used for delivery.",
    label: "Inactive",
  },
  [SmtpConnectionStatus.Disconnected]: {
    color: "default",
    description:
      "This connection is permanently disabled and its credential was erased.",
    label: "Disconnected",
  },
} as const;

function ErrorAlert({ error }: { error: Error | null }) {
  return error ? <Alert message={error.message} showIcon type="error" /> : null;
}

function ConnectionStatus({ status }: { status: SmtpConnectionStatus }) {
  const presentation = statusPresentation[status];
  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}

function createSettings(
  connection: SmtpConnection,
): SmtpSettings {
  return {
    displayName: connection.displayName,
    provider: connection.provider,
    host: connection.host,
    port: connection.port,
    security: connection.security,
    username: connection.username ?? undefined,
    password: "",
  };
}

function ConnectionsPage({ sdk }: { sdk: AdminAppPageProps["sdk"] }) {
  const { styles } = useStyles();
  const query = useSmtpConnections(sdk);
  const actions = useSmtpConnectionActions(sdk);
  const connections = useMemo(
    () =>
      [...query.connections].sort(
        (left, right) =>
          Number(left.status === SmtpConnectionStatus.Disconnected) -
          Number(right.status === SmtpConnectionStatus.Disconnected),
      ),
    [query.connections],
  );

  const openConnection = (connectionId: string) => {
    sdk.navigation.openAppPath(`connections/${connectionId}`);
  };

  const addConnection = async () => {
    try {
      const result = await sdk.modals.openApp<
        CreateSmtpConnectionModalPayload,
        CreateSmtpConnectionModalResult
      >(CREATE_SMTP_CONNECTION_MODAL_ID, { presets: query.presets });
      if (result.status !== "submitted") return;

      sdk.notifications.success("SMTP connection added");
      openConnection(result.data.connectionId);
    } catch (error) {
      sdk.notifications.error(
        "Unable to add SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const activateConnection = async (connection: SmtpConnection) => {
    try {
      await actions.activateConnection(connection.id);
      sdk.notifications.success("SMTP connection activated");
      await query.refetch();
    } catch (error) {
      sdk.notifications.error(
        "Unable to activate SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <sdk.ui.AppPage
      actions={
        <Button
          disabled={query.presets.length === 0}
          loading={actions.loading}
          type="primary"
          onClick={() => void addConnection()}
        >
          Add connection
        </Button>
      }
    >
      <div className={styles.stack}>
        <ErrorAlert error={query.error} />
        <Paper>
          <PaperHeader title="SMTP connections" />
          <Spin spinning={query.loading}>
            {connections.length > 0 ? (
              <List
                dataSource={connections}
                renderItem={(connection) => {
                  const isDisconnected =
                    connection.status === SmtpConnectionStatus.Disconnected;
                  const isInactive =
                    connection.status === SmtpConnectionStatus.Inactive;

                  return (
                    <List.Item>
                      <div
                        aria-disabled={isDisconnected}
                        className={`${styles.connectionRow} ${
                          isDisconnected ? styles.connectionRowDisabled : ""
                        }`}
                        role="link"
                        tabIndex={isDisconnected ? -1 : 0}
                        onClick={
                          isDisconnected
                            ? undefined
                            : () => openConnection(connection.id)
                        }
                        onKeyDown={
                          isDisconnected
                            ? undefined
                            : (event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  openConnection(connection.id);
                                }
                              }
                        }
                      >
                        <div className={styles.connectionCopy}>
                          <Typography.Text strong ellipsis>
                            {connection.displayName}
                          </Typography.Text>
                          <Typography.Text type="secondary" ellipsis>
                            Created{" "}
                            {dateFormatter.format(
                              new Date(connection.createdAt),
                            )}
                          </Typography.Text>
                        </div>
                        <ConnectionStatus status={connection.status} />
                        {isInactive ? (
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: "activate",
                                  label: "Make active",
                                  onClick: () => {
                                    void activateConnection(connection);
                                  },
                                },
                              ],
                            }}
                            trigger={["click"]}
                          >
                            <Button
                              aria-label={`Actions for ${connection.displayName}`}
                              icon={<LuEllipsis size={16} />}
                              type="text"
                              onClick={(event) => event.stopPropagation()}
                            />
                          </Dropdown>
                        ) : null}
                      </div>
                    </List.Item>
                  );
                }}
              />
            ) : query.loading ? null : (
              <Empty
                description="No SMTP connections configured"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Spin>
        </Paper>
      </div>
    </sdk.ui.AppPage>
  );
}

function ConnectionDetailPage({
  sdk,
  connectionId,
}: {
  sdk: AdminAppPageProps["sdk"];
  connectionId: string;
}) {
  const { styles } = useStyles();
  const query = useSmtpConnection(sdk, connectionId);
  const actions = useSmtpConnectionActions(sdk);
  const connection = query.connection;

  const updateConnection = async (settings: SmtpSettings) => {
    if (!connection) return false;
    try {
      await actions.updateConnection({
        connectionId: connection.id,
        ...settings,
      });
      sdk.notifications.success("SMTP connection updated");
      await query.refetch();
      return true;
    } catch (error) {
      sdk.notifications.error(
        "Unable to update SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
      return false;
    }
  };

  const activateConnection = async () => {
    if (!connection) return;
    try {
      await actions.activateConnection(connection.id);
      sdk.notifications.success("SMTP connection activated");
      await query.refetch();
    } catch (error) {
      sdk.notifications.error(
        "Unable to activate SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const disconnectConnection = async () => {
    if (!connection) return;

    try {
      const result = await sdk.modals.openApp<
        SmtpDisconnectModalPayload,
        SmtpDisconnectModalResult
      >(SMTP_DISCONNECT_MODAL_ID, {
        connectionId: connection.id,
        displayName: connection.displayName,
      });
      if (result.status === "submitted") {
        sdk.notifications.success("SMTP connection disconnected");
        sdk.navigation.openAppPath("connections");
      }
    } catch (error) {
      sdk.notifications.error(
        "Unable to open disconnect SMTP connection",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <sdk.ui.AppPage
      onBack={() => sdk.navigation.openAppPath("connections")}
      title={connection?.displayName ?? "SMTP connection"}
    >
      <Spin spinning={query.loading}>
        <div className={styles.stack}>
          <ErrorAlert error={query.error} />
          {connection ? (
            <>
              <Paper>
                <PaperHeader
                  actions={
                    connection.status ===
                    SmtpConnectionStatus.Inactive ? (
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: "activate",
                              label: "Make active",
                              onClick: () => {
                                void activateConnection();
                              },
                            },
                          ],
                        }}
                        trigger={["click"]}
                      >
                        <Button
                          aria-label={`Actions for ${connection.displayName}`}
                          icon={<LuEllipsis size={16} />}
                          loading={actions.loading}
                          size="small"
                          type="text"
                        />
                      </Dropdown>
                    ) : null
                  }
                  title="SMTP connection"
                />
                <div className={styles.connectionStatus}>
                  <Flex vertical>
                    <Typography.Text strong>
                      Connection status
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {statusPresentation[connection.status].description}
                    </Typography.Text>
                  </Flex>
                  <ConnectionStatus status={connection.status} />
                </div>
              </Paper>

              <SmtpSettingsForm
                key={connection.updatedAt}
                disabled={
                  connection.status === SmtpConnectionStatus.Disconnected
                }
                hasStoredPassword={connection.hasPassword}
                initialValue={createSettings(connection)}
                loading={actions.loading}
                presets={query.presets}
                submitLabel="Save changes"
                onSubmit={updateConnection}
              />

              <Paper>
                <PaperHeader title="Danger zone" />
                <Divider className={styles.dangerDivider} />
                <div className={styles.dangerRow}>
                  <Flex vertical>
                    <Typography.Text strong>
                      Disconnect SMTP connection
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      Permanently disables this connection and erases its
                      stored credential.
                    </Typography.Text>
                  </Flex>
                  <Button
                    danger
                    disabled={
                      connection.status ===
                      SmtpConnectionStatus.Disconnected
                    }
                    onClick={() => void disconnectConnection()}
                  >
                    Disconnect
                  </Button>
                </div>
              </Paper>
            </>
          ) : query.loading ? null : (
            <Empty description="SMTP connection not found" />
          )}
        </div>
      </Spin>
    </sdk.ui.AppPage>
  );
}

export default function SmtpAdminPage({
  sdk,
  route,
}: AdminAppPageProps) {
  const routeSegments = route.appPath.split("/").filter(Boolean);
  const connectionId =
    routeSegments[0] === "connections" && routeSegments.length > 1
      ? routeSegments.slice(1).join("/")
      : null;

  if (connectionId) {
    return (
      <ConnectionDetailPage
        key={connectionId}
        connectionId={connectionId}
        sdk={sdk}
      />
    );
  }

  return <ConnectionsPage sdk={sdk} />;
}
