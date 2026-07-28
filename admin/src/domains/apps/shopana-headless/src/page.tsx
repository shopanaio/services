"use client";

import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Dropdown,
  Empty,
  Flex,
  Input,
  List,
  Spin,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useMemo, useState } from "react";
import {
  LuCopy,
  LuEllipsis,
  LuEye,
  LuEyeOff,
} from "react-icons/lu";
import type { AdminAppPageProps } from "@shopana/admin-app-sdk";
import {
  HeadlessStorefrontConnectionStatus,
  StorefrontCredentialKind,
  StorefrontCredentialStatus,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  useHeadlessStorefront,
  useHeadlessStorefrontActions,
  useHeadlessStorefronts,
} from "./hooks";
import type { HeadlessStorefront } from "./graphql/operation-types";
import {
  CREATE_STOREFRONT_MODAL_ID,
  DISCONNECT_STOREFRONT_MODAL_ID,
  RENAME_STOREFRONT_MODAL_ID,
} from "./modals";
import type {
  CreateStorefrontModalPayload,
  CreateStorefrontModalResult,
  DisconnectStorefrontModalPayload,
  DisconnectStorefrontModalResult,
  RenameStorefrontModalPayload,
  RenameStorefrontModalResult,
} from "./modals";
import { groupStorefrontPermissions } from "./permissions";

const useStyles = createStyles(({ token }) => ({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: token.padding,
  },
  storefrontRow: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: token.paddingSM,
    minWidth: 0,
    width: "100%",
  },
  storefrontRowDisabled: {
    cursor: "not-allowed",
    opacity: 0.5,
  },
  storefrontCopy: {
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
  credentialStack: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingSM,
  },
  credentialField: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXXS,
  },
  credentialInput: {
    display: "flex",
    gap: token.paddingXS,
  },
  rotation: {
    alignItems: "center",
    background: token.colorFillQuaternary,
    borderRadius: token.borderRadiusLG,
    display: "flex",
    justifyContent: "space-between",
    padding: token.paddingSM,
  },
  permissions: {
    display: "grid",
    gap: `${token.padding}px ${token.paddingLG}px`,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginBottom: token.margin,
    [`@media (max-width: ${token.screenSM}px)`]: {
      gridTemplateColumns: "1fr",
    },
  },
  permissionGroup: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXS,
  },
  permission: {
    display: "flex",
    flexDirection: "column",
    gap: token.paddingXXS,
  },
  permissionDescription: {
    paddingLeft: token.paddingLG,
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
  [HeadlessStorefrontConnectionStatus.Active]: {
    color: "success",
    description: "The storefront can access the Storefront API.",
    label: "Active",
  },
  [HeadlessStorefrontConnectionStatus.Suspended]: {
    color: "warning",
    description: "Storefront API access is temporarily disabled.",
    label: "Suspended",
  },
  [HeadlessStorefrontConnectionStatus.Disconnected]: {
    color: "default",
    description: "Storefront API access is permanently disabled.",
    label: "Disconnected",
  },
} as const;

function ErrorAlert({ error }: { error: Error | null }) {
  return error ? <Alert message={error.message} showIcon type="error" /> : null;
}

function StorefrontStatus({
  status,
}: {
  status: HeadlessStorefrontConnectionStatus;
}) {
  const presentation = statusPresentation[status];
  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}

function StorefrontsPage({
  sdk,
  onPrivateToken,
}: {
  sdk: AdminAppPageProps["sdk"];
  onPrivateToken: (storefrontId: string, token: string) => void;
}) {
  const { styles } = useStyles();
  const query = useHeadlessStorefronts(sdk);
  const actions = useHeadlessStorefrontActions(sdk);
  const storefronts = useMemo(
    () =>
      [...query.storefronts].sort(
        (left, right) =>
          Number(
            left.status === HeadlessStorefrontConnectionStatus.Disconnected,
          ) -
          Number(
            right.status === HeadlessStorefrontConnectionStatus.Disconnected,
          ),
      ),
    [query.storefronts],
  );

  const openStorefront = (storefrontId: string) => {
    sdk.navigation.openAppPath(`storefronts/${storefrontId}`);
  };

  const addStorefront = async () => {
    try {
      const result = await sdk.modals.openApp<
        CreateStorefrontModalPayload,
        CreateStorefrontModalResult
      >(CREATE_STOREFRONT_MODAL_ID, {
        permissionCatalog: query.permissionCatalog,
        defaultPermissions: query.defaultPermissions,
      });
      if (result.status === "submitted") {
        if (result.data.privateAccessToken) {
          onPrivateToken(
            result.data.storefrontId,
            result.data.privateAccessToken,
          );
        }
        sdk.notifications.success("Storefront added");
        openStorefront(result.data.storefrontId);
      }
    } catch (error) {
      sdk.notifications.error(
        "Unable to open storefront settings",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const toggleStatus = async (storefront: HeadlessStorefront) => {
    try {
      await actions.setSuspended(
        storefront.id,
        storefront.status === HeadlessStorefrontConnectionStatus.Active,
      );
      sdk.notifications.success(
        storefront.status === HeadlessStorefrontConnectionStatus.Active
          ? "Storefront suspended"
          : "Storefront resumed",
      );
      await query.refetch();
    } catch (error) {
      sdk.notifications.error(
        "Unable to update storefront",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  return (
    <sdk.ui.AppPage
      actions={
        <Button
          disabled={query.permissionCatalog.length === 0}
          loading={actions.loading || query.loading}
          type="primary"
          onClick={() => void addStorefront()}
        >
          Add storefront
        </Button>
      }
    >
      <div className={styles.stack}>
        <ErrorAlert error={query.error} />
        <Paper>
          <PaperHeader title="Storefront connections" />
          <Spin spinning={query.loading}>
            {storefronts.length > 0 ? (
              <List
                dataSource={storefronts}
                renderItem={(storefront) => {
                  const isDisconnected =
                    storefront.status ===
                    HeadlessStorefrontConnectionStatus.Disconnected;

                  return (
                    <List.Item>
                      <div
                        aria-disabled={isDisconnected}
                        className={`${styles.storefrontRow} ${
                          isDisconnected ? styles.storefrontRowDisabled : ""
                        }`}
                        role="link"
                        tabIndex={isDisconnected ? -1 : 0}
                        onClick={
                          isDisconnected
                            ? undefined
                            : () => openStorefront(storefront.id)
                        }
                        onKeyDown={
                          isDisconnected
                            ? undefined
                            : (event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  openStorefront(storefront.id);
                                }
                              }
                        }
                      >
                        <div className={styles.storefrontCopy}>
                          <Typography.Text strong ellipsis>
                            {storefront.displayName}
                          </Typography.Text>
                          <Typography.Text type="secondary" ellipsis>
                            Created {dateFormatter.format(new Date(storefront.createdAt))}
                          </Typography.Text>
                        </div>
                        <StorefrontStatus status={storefront.status} />
                        {!isDisconnected ? (
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: "toggle-status",
                                  label:
                                    storefront.status ===
                                    HeadlessStorefrontConnectionStatus.Active
                                      ? "Suspend"
                                      : "Resume",
                                  onClick: () => {
                                    void toggleStatus(storefront);
                                  },
                                },
                              ],
                            }}
                            trigger={["click"]}
                          >
                            <Button
                              aria-label={`Actions for ${storefront.displayName}`}
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
                description="No storefronts connected"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Spin>
        </Paper>
      </div>
    </sdk.ui.AppPage>
  );
}

function StorefrontDetailPage({
  sdk,
  storefrontId,
  privateToken,
  onPrivateToken,
}: {
  sdk: AdminAppPageProps["sdk"];
  storefrontId: string;
  privateToken?: string;
  onPrivateToken: (storefrontId: string, token: string) => void;
}) {
  const { styles } = useStyles();
  const query = useHeadlessStorefront(sdk, storefrontId);
  const actions = useHeadlessStorefrontActions(sdk);
  const [showPrivateToken, setShowPrivateToken] = useState(false);
  const [permissionDraftOverride, setPermissionDraftOverride] = useState<
    string[] | null
  >(null);

  const storefront = query.storefront;
  const accessPolicy = storefront?.storefrontAccessPolicy;
  const permissionDraft =
    permissionDraftOverride ?? accessPolicy?.permissions ?? [];

  const activePrivateCredential = storefront?.storefrontCredentials.find(
    ({ kind, status }) =>
      kind === StorefrontCredentialKind.Private &&
      status === StorefrontCredentialStatus.Active,
  );
  const privateTokenDisplay = privateToken
    ? showPrivateToken
      ? privateToken
      : privateToken.replace(/.(?=.{4})/g, "•")
    : activePrivateCredential
      ? `••••••••••••${activePrivateCredential.tokenHint}`
      : "No active private token";

  const copy = async (value: string | null | undefined, label: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    sdk.notifications.success(`${label} copied`);
  };

  const rename = async () => {
    if (!storefront) return;

    try {
      const result = await sdk.modals.openApp<
        RenameStorefrontModalPayload,
        RenameStorefrontModalResult
      >(RENAME_STOREFRONT_MODAL_ID, {
        storefrontId: storefront.id,
        displayName: storefront.displayName,
      });
      if (result.status === "submitted") {
        sdk.notifications.success("Storefront renamed");
        await query.refetch();
      }
    } catch (error) {
      sdk.notifications.error(
        "Unable to open rename storefront",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const rotatePrivateToken = async () => {
    if (!storefront) return;

    try {
      const result = await actions.createPrivateCredential(
        storefront.id,
        `Rotated ${new Date().toISOString()}`,
      );
      if (!result.privateAccessToken) {
        throw new Error("The private token was not returned by the API.");
      }
      onPrivateToken(storefront.id, result.privateAccessToken);
      setShowPrivateToken(true);
      sdk.notifications.success("Private token generated");
      await query.refetch();
    } catch (error) {
      sdk.notifications.error(
        "Unable to generate token",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const toggleConnectionStatus = async () => {
    if (!storefront) return;
    const suspend =
      storefront.status === HeadlessStorefrontConnectionStatus.Active;

    try {
      await actions.setSuspended(storefront.id, suspend);
      sdk.notifications.success(
        suspend ? "Storefront suspended" : "Storefront resumed",
      );
      await query.refetch();
    } catch (error) {
      sdk.notifications.error(
        "Unable to update storefront",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const togglePermission = (handle: string, enabled: boolean) => {
    setPermissionDraftOverride((current) => {
      const permissions = current ?? accessPolicy?.permissions ?? [];
      return enabled
        ? [...new Set([...permissions, handle])]
        : permissions.filter((permission) => permission !== handle);
    });
  };

  const savedPermissions = accessPolicy?.permissions ?? [];
  const hasPermissionChanges =
    permissionDraft.length !== savedPermissions.length ||
    permissionDraft.some(
      (permission) => !savedPermissions.includes(permission),
    );

  const savePermissions = async () => {
    if (!storefront || !accessPolicy || !hasPermissionChanges) return;
    try {
      await actions.updatePolicy(
        storefront.id,
        permissionDraft,
        accessPolicy.revision,
      );
      sdk.notifications.success("Storefront permissions saved");
      await query.refetch();
      setPermissionDraftOverride(null);
    } catch (error) {
      sdk.notifications.error(
        "Unable to update permissions",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const disconnect = async () => {
    if (!storefront) return;

    try {
      const result = await sdk.modals.openApp<
        DisconnectStorefrontModalPayload,
        DisconnectStorefrontModalResult
      >(DISCONNECT_STOREFRONT_MODAL_ID, {
        storefrontId: storefront.id,
        displayName: storefront.displayName,
      });
      if (result.status === "submitted") {
        sdk.notifications.success("Storefront disconnected");
        sdk.navigation.openAppPath("storefronts");
      }
    } catch (error) {
      sdk.notifications.error(
        "Unable to open disconnect storefront",
        error instanceof Error ? error.message : undefined,
      );
    }
  };

  const groupedPermissions = useMemo(
    () => groupStorefrontPermissions(query.permissionCatalog),
    [query.permissionCatalog],
  );

  if (query.loading && !storefront) {
    return <Spin fullscreen tip="Loading storefront…" />;
  }

  return (
    <sdk.ui.AppPage
      onBack={() => sdk.navigation.openAppPath("storefronts")}
      title={storefront?.displayName ?? "Storefront"}
    >
      <Spin spinning={query.loading}>
        <div className={styles.stack}>
          <ErrorAlert error={query.error} />
          {storefront ? (
            <>
              <Paper>
                <PaperHeader
                  actions={
                    storefront.status !==
                    HeadlessStorefrontConnectionStatus.Disconnected ? (
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: "toggle-status",
                              label:
                                storefront.status ===
                                HeadlessStorefrontConnectionStatus.Active
                                  ? "Suspend"
                                  : "Resume",
                              onClick: () => {
                                void toggleConnectionStatus();
                              },
                            },
                          ],
                        }}
                        trigger={["click"]}
                      >
                        <Button
                          aria-label={`Actions for ${storefront.displayName}`}
                          icon={<LuEllipsis size={16} />}
                          loading={actions.loading}
                          size="small"
                          type="text"
                        />
                      </Dropdown>
                    ) : null
                  }
                  title="Storefront connection"
                />
                <div className={styles.connectionStatus}>
                  <Flex vertical>
                    <Typography.Text strong>Connection status</Typography.Text>
                    <Typography.Text type="secondary">
                      {statusPresentation[storefront.status].description}
                    </Typography.Text>
                  </Flex>
                  <StorefrontStatus status={storefront.status} />
                </div>
              </Paper>

              <Paper>
                <PaperHeader title="Credentials" />
                <div className={styles.credentialStack}>
                  <div className={styles.credentialField}>
                    <Typography.Text strong>Public access token</Typography.Text>
                    <Typography.Text type="secondary">
                      Use in browser and other client-side storefront contexts.
                    </Typography.Text>
                    <div className={styles.credentialInput}>
                      <Input readOnly value={storefront.publicAccessToken ?? ""} />
                      <Button
                        aria-label="Copy public access token"
                        disabled={!storefront.publicAccessToken}
                        icon={<LuCopy size={16} />}
                        onClick={() =>
                          void copy(
                            storefront.publicAccessToken,
                            "Public access token",
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.credentialField}>
                    <Typography.Text strong>Private access token</Typography.Text>
                    <Typography.Text type="secondary">
                      Use only in trusted server-side storefront contexts.
                    </Typography.Text>
                    <div className={styles.credentialInput}>
                      <Input readOnly value={privateTokenDisplay} />
                      <Button
                        aria-label={
                          showPrivateToken
                            ? "Hide private access token"
                            : "Reveal private access token"
                        }
                        disabled={!privateToken}
                        icon={
                          showPrivateToken ? (
                            <LuEyeOff size={16} />
                          ) : (
                            <LuEye size={16} />
                          )
                        }
                        onClick={() => setShowPrivateToken((current) => !current)}
                      />
                      <Button
                        aria-label="Copy private access token"
                        disabled={!privateToken}
                        icon={<LuCopy size={16} />}
                        onClick={() =>
                          void copy(privateToken, "Private access token")
                        }
                      />
                    </div>
                  </div>
                  <div className={styles.rotation}>
                    <Flex vertical>
                      <Typography.Text strong>
                        Rotate private access token
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        The existing token remains valid until you revoke it.
                      </Typography.Text>
                    </Flex>
                    <Button
                      loading={actions.loading}
                      onClick={() => void rotatePrivateToken()}
                    >
                      Generate new token
                    </Button>
                  </div>
                </div>
              </Paper>

              <Paper>
                <PaperHeader
                  actions={
                    hasPermissionChanges ? (
                      <Button
                        color="primary"
                        loading={actions.loading}
                        size="small"
                        variant="outlined"
                        onClick={() => void savePermissions()}
                      >
                        Save
                      </Button>
                    ) : null
                  }
                  title="Permissions"
                />
                <div className={styles.permissions}>
                  {groupedPermissions.map((group) => (
                    <div className={styles.permissionGroup} key={group.label}>
                      <Typography.Text strong>{group.label}</Typography.Text>
                      {group.permissions.map((permission) => (
                        <div className={styles.permission} key={permission.handle}>
                          <Checkbox
                            checked={permissionDraft.includes(
                              permission.handle,
                            )}
                            disabled={
                              actions.loading ||
                              !storefront.storefrontAccessPolicy
                            }
                            onChange={({ target }) =>
                              togglePermission(
                                permission.handle,
                                target.checked,
                              )
                            }
                          >
                            {permission.label}
                          </Checkbox>
                          <Typography.Text
                            className={styles.permissionDescription}
                            type="secondary"
                          >
                            {permission.description}
                          </Typography.Text>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <Flex justify="space-between">
                  <Typography.Text type="secondary">
                    {permissionDraft.length} of {query.permissionCatalog.length}{" "}
                    permissions enabled
                  </Typography.Text>
                  {accessPolicy ? (
                    <Typography.Text type="secondary">
                      Policy revision {accessPolicy.revision}
                    </Typography.Text>
                  ) : null}
                </Flex>
              </Paper>

              <Paper>
                <PaperHeader title="Danger zone" />
                <div className={styles.dangerRow}>
                  <Flex vertical>
                    <Typography.Text strong>Rename storefront</Typography.Text>
                    <Typography.Text type="secondary">
                      Change the name used to identify this storefront.
                    </Typography.Text>
                  </Flex>
                  <Button
                    loading={actions.loading}
                    onClick={() => void rename()}
                  >
                    Rename
                  </Button>
                </div>
                <Divider className={styles.dangerDivider} />
                <div className={styles.dangerRow}>
                  <Flex vertical>
                    <Typography.Text strong>
                      Disconnect storefront
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      Permanently invalidates every credential issued for this
                      storefront.
                    </Typography.Text>
                  </Flex>
                  <Button
                    danger
                    onClick={() => void disconnect()}
                  >
                    Disconnect
                  </Button>
                </div>
              </Paper>
            </>
          ) : query.loading ? null : (
            <Empty description="Storefront not found" />
          )}
        </div>
      </Spin>
    </sdk.ui.AppPage>
  );
}

export default function HeadlessAdminPage({
  sdk,
  route,
}: AdminAppPageProps) {
  const [privateTokens, setPrivateTokens] = useState<Record<string, string>>({});
  const routeSegments = route.appPath.split("/").filter(Boolean);
  const storefrontId =
    routeSegments[0] === "storefronts" && routeSegments.length > 1
      ? routeSegments.slice(1).join("/")
      : null;
  const rememberPrivateToken = (id: string, token: string) => {
    setPrivateTokens((current) => ({ ...current, [id]: token }));
  };

  if (storefrontId) {
    return (
      <StorefrontDetailPage
        key={storefrontId}
        privateToken={privateTokens[storefrontId]}
        sdk={sdk}
        storefrontId={storefrontId}
        onPrivateToken={rememberPrivateToken}
      />
    );
  }

  return (
    <StorefrontsPage
      sdk={sdk}
      onPrivateToken={rememberPrivateToken}
    />
  );
}
