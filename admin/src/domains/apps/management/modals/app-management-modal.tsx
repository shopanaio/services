"use client";

import { useMemo } from "react";
import {
  Alert,
  App,
  Avatar,
  Button,
  Collapse,
  Empty,
  Flex,
  Skeleton,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import {
  LuActivity,
  LuCircleCheck,
  LuCodeXml,
  LuExternalLink,
  LuShieldCheck,
} from "react-icons/lu";
import {
  AppInstallationStatus,
  AppLifecycleOperationStatus,
  AppRuntimeStatus,
} from "@/graphql/types";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { usePathParams } from "@/registry";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { createAdminAppPath } from "../../runtime/app-route";
import type { ManagementAppListItem } from "../graphql/operation-types";
import {
  useAppLifecycleActions,
  useAppsManagement,
  useInstallApp,
} from "../hooks";
import type { AppManagementModalPayload } from "../modals";

const APP_AVATAR_COLORS = [
  "#598cf5",
  "#6eb84a",
  "#876bd1",
  "#dc6f5e",
  "#36a3a0",
] as const;

const PENDING_STATUSES = new Set<AppInstallationStatus>([
  AppInstallationStatus.Installing,
  AppInstallationStatus.PendingConsent,
  AppInstallationStatus.Resuming,
  AppInstallationStatus.Suspending,
  AppInstallationStatus.Uninstalling,
  AppInstallationStatus.Updating,
]);

const useStyles = createStyles(({ token }) => ({
  summary: {
    display: "flex",
    alignItems: "center",
    gap: token.margin,
  },
  avatar: {
    flex: "0 0 auto",
    borderRadius: token.borderRadiusLG,
  },
  summaryCopy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
  },
  appName: {
    fontSize: token.fontSizeLG,
    lineHeight: token.lineHeightLG,
  },
  meta: {
    fontSize: token.fontSizeSM,
  },
  description: {
    margin: `${token.marginXS}px 0 0 !important`,
    color: token.colorTextSecondary,
  },
  sectionDescription: {
    display: "block",
    marginBottom: token.margin,
  },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginSM,
  },
  accessRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: token.marginSM,
    padding: `${token.paddingSM}px ${token.padding}px`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
  },
  accessIcon: {
    flex: "0 0 auto",
    width: 18,
    height: 18,
    marginTop: 1,
    color: token.colorPrimary,
  },
  accessCopy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
  },
  accessName: {
    fontSize: token.fontSizeSM,
  },
  accessDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  surfaces: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: token.marginSM,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "1fr",
    },
  },
  surface: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: token.marginSM,
    padding: `${token.paddingSM}px ${token.padding}px`,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  },
  surfaceName: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
  },
  timeline: {
    marginTop: token.marginXS,
    "& .ant-timeline-item-section": {
      minWidth: 0,
    },
    "& .ant-timeline-item-content": {
      width: "100%",
      minWidth: 0,
    },
  },
  timelineEntry: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "start",
    gap: token.margin,
    width: "100%",
    minWidth: 0,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  timelineCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 0,
  },
  timelineMeta: {
    alignItems: "flex-end",
    "@media (max-width: 700px)": {
      alignItems: "flex-start",
    },
  },
  timelineStatus: {
    marginInlineEnd: 0,
  },
  timelineDate: {
    fontSize: token.fontSizeSM,
    whiteSpace: "nowrap",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: token.marginLG,
  },
  controlCopy: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  dangerPaper: {
    borderColor: token.colorErrorBorder,
  },
  dangerRows: {
    display: "flex",
    flexDirection: "column",
  },
  dangerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: token.marginLG,
    minHeight: 56,
    "&:not(:last-child)": {
      paddingBottom: token.paddingSM,
      marginBottom: token.paddingSM,
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
    },
  },
}));

const getAvatarColor = (appCode: string) => {
  const hash = [...appCode].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return APP_AVATAR_COLORS[hash % APP_AVATAR_COLORS.length];
};

const formatLabel = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "In progress";

const getOperationColor = (status: AppLifecycleOperationStatus) => {
  if (status === AppLifecycleOperationStatus.Succeeded) return "green";
  if (status === AppLifecycleOperationStatus.Failed) return "red";
  return "blue";
};

function AppSummary({
  app,
  openHref,
}: {
  app: ManagementAppListItem;
  openHref: string | null;
}) {
  const { styles } = useStyles();
  const version = app.installation?.installedVersion ?? app.version;

  return (
    <Paper>
      <div className={styles.summary}>
        <Avatar
          className={styles.avatar}
          shape="square"
          size={40}
          style={{ backgroundColor: getAvatarColor(app.code) }}
        >
          {app.displayName.trim().charAt(0).toUpperCase()}
        </Avatar>
        <div className={styles.summaryCopy}>
          <Typography.Text className={styles.appName} strong>
            {app.displayName}
          </Typography.Text>
          <Typography.Text className={styles.meta} type="secondary">
            Version {version}
          </Typography.Text>
        </div>
        {openHref ? (
          <Button
            href={openHref}
            icon={<LuExternalLink aria-hidden />}
            size="small"
          >
            Open
          </Button>
        ) : null}
      </div>
      <Typography.Paragraph className={styles.description}>
        {app.description}
      </Typography.Paragraph>
    </Paper>
  );
}

function AccessAndCapabilities({ app }: { app: ManagementAppListItem }) {
  const { styles } = useStyles();

  return (
    <Paper>
      <PaperHeader title="Access and capabilities" />
      <Typography.Text className={styles.sectionDescription} type="secondary">
        Permissions and platform surfaces declared by this app.
      </Typography.Text>

      <div className={styles.rows}>
        {app.permissions.map(({ granted, scope }) => (
          <div className={styles.accessRow} key={scope}>
            <LuShieldCheck aria-hidden className={styles.accessIcon} />
            <div className={styles.accessCopy}>
              <Typography.Text className={styles.accessName} strong>
                {scope}
              </Typography.Text>
              <Typography.Text className={styles.accessDescription}>
                {app.installed
                  ? granted
                    ? "Permission granted to this installation."
                    : "Permission requested but not granted."
                  : "This permission will be granted during installation."}
              </Typography.Text>
            </div>
            <Tag color={granted ? "green" : app.installed ? "default" : "blue"}>
              {granted ? "Granted" : app.installed ? "Not granted" : "Requested"}
            </Tag>
          </div>
        ))}

        {app.permissions.length === 0 ? (
          <Typography.Text type="secondary">
            This app does not request additional permissions.
          </Typography.Text>
        ) : null}

        <div className={styles.surfaces}>
          {[
            { label: "Admin API", enabled: app.graphql.admin },
            { label: "Storefront API", enabled: app.graphql.storefront },
          ].map(({ label, enabled }) => (
            <div className={styles.surface} key={label}>
              <span className={styles.surfaceName}>
                <LuCodeXml aria-hidden />
                <Typography.Text strong>{label}</Typography.Text>
              </span>
              <Tag color={enabled ? "green" : "default"}>
                {enabled ? "Enabled" : "Disabled"}
              </Tag>
            </div>
          ))}
        </div>

        {app.capabilities.map((capability) => (
          <div className={styles.accessRow} key={capability.key}>
            <LuActivity aria-hidden className={styles.accessIcon} />
            <div className={styles.accessCopy}>
              <Typography.Text className={styles.accessName} strong>
                {formatLabel(capability.key)}
              </Typography.Text>
              <Typography.Text className={styles.accessDescription}>
                {capability.operations
                  .map(({ name }) => formatLabel(name))
                  .join(", ") || "No operations declared"}
              </Typography.Text>
            </div>
            <Tag>{formatLabel(capability.assignmentMode)}</Tag>
          </div>
        ))}
      </div>
    </Paper>
  );
}

function AppHistory({ app }: { app: ManagementAppListItem }) {
  const { styles } = useStyles();
  const installation = app.installation;
  if (!installation) return null;

  const operations = installation.lifecycleOperations.edges.map(
    ({ node }) => node,
  );

  return (
    <Paper>
      <PaperHeader title="App history" />
      <Typography.Text className={styles.sectionDescription} type="secondary">
        Installation and lifecycle activity for this store.
      </Typography.Text>

      {operations.length > 0 ? (
        <Timeline
          className={styles.timeline}
          items={operations.map((operation) => ({
            color: getOperationColor(operation.status),
            icon:
              operation.status === AppLifecycleOperationStatus.Succeeded ? (
                <LuCircleCheck aria-hidden />
              ) : undefined,
            content: (
              <div className={styles.timelineEntry}>
                <div className={styles.timelineCopy}>
                  <Typography.Text strong>
                    {formatLabel(operation.type)}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Version {operation.targetVersion}
                  </Typography.Text>
                  {operation.error ? (
                    <Typography.Text type="danger">
                      {operation.error.message}
                    </Typography.Text>
                  ) : null}
                </div>
                <div className={`${styles.timelineCopy} ${styles.timelineMeta}`}>
                  <Tag
                    className={styles.timelineStatus}
                    color={getOperationColor(operation.status)}
                  >
                    {formatLabel(operation.status)}
                  </Tag>
                  <Typography.Text
                    className={styles.timelineDate}
                    type="secondary"
                  >
                    {formatDate(
                      operation.completedAt ??
                        operation.startedAt ??
                        operation.createdAt,
                    )}
                  </Typography.Text>
                </div>
              </div>
            ),
          }))}
        />
      ) : (
        <Empty
          description="No lifecycle activity yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      <Collapse
        ghost
        items={[
          {
            key: "technical-details",
            label: "Technical details",
            children: (
              <Flex vertical gap={8}>
                <Typography.Text>
                  Installation ID:{" "}
                  <Typography.Text code>{installation.id}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Status: <Typography.Text code>{installation.status}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Health: <Typography.Text code>{installation.healthStatus}</Typography.Text>
                </Typography.Text>
                <Typography.Text>
                  Updated: {formatDate(installation.updatedAt)}
                </Typography.Text>
              </Flex>
            ),
          },
        ]}
      />
    </Paper>
  );
}

export const AppManagementModal = () => {
  const { styles } = useStyles();
  const { message, modal } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const { getParam } = usePathParams();
  const { appCode } = payload as AppManagementModalPayload;
  const { apps, loading, error } = useAppsManagement();
  const {
    installApp,
    loading: installing,
    error: installError,
  } = useInstallApp();
  const {
    runAction,
    loading: lifecycleLoading,
    error: lifecycleError,
  } = useAppLifecycleActions();
  const app = useMemo(
    () => apps.find(({ code }) => code === appCode) ?? null,
    [appCode, apps],
  );

  const showErrors = (errors: Array<{ message: string }>) => {
    message.error(errors.map(({ message: text }) => text).join("\n"));
  };

  const install = async () => {
    if (!app) return;
    const result = await installApp({
      appCode: app.code,
      clientMutationId: crypto.randomUUID(),
      grantedScopes: app.permissions.map(({ scope }) => scope),
    });
    if (result.userErrors.length > 0) {
      showErrors(result.userErrors);
      return;
    }
    message.success(`${app.displayName} installation started`);
  };

  const confirmInstall = async () => {
    if (!app) return;
    const permissions = app.permissions.length;
    const confirmed = await modal.confirm({
      icon: null,
      title: `Install ${app.displayName}?`,
      content:
        permissions > 0
          ? `The app will receive ${permissions} ${permissions === 1 ? "permission" : "permissions"} shown above.`
          : "The app will be installed for this store.",
      okText: "Install app",
    });
    if (confirmed) {
      await install();
    }
  };

  const runLifecycleAction = async (
    action: "resume" | "suspend" | "uninstall",
  ) => {
    if (!app?.installation) return;
    const result = await runAction(action, app.installation.id);
    if (result.userErrors.length > 0) {
      showErrors(result.userErrors);
      return;
    }
    message.success(
      `${app.displayName} ${action === "uninstall" ? "uninstall" : action} started`,
    );
  };

  const uninstall = async () => {
    if (!app) return;
    const confirmed = await modal.confirm({
      icon: null,
      title: `Uninstall ${app.displayName}?`,
      content:
        "The app will lose access to this store and its installation will be removed.",
      okText: "Uninstall app",
      okButtonProps: { danger: true },
    });
    if (confirmed) {
      await runLifecycleAction("uninstall");
    }
  };

  const suspend = async () => {
    if (!app) return;
    const confirmed = await modal.confirm({
      icon: null,
      title: `Suspend ${app.displayName}?`,
      content:
        "The app and its integrations will stop working until the app is resumed.",
      okText: "Suspend app",
      okButtonProps: { danger: true },
    });
    if (confirmed) {
      await runLifecycleAction("suspend");
    }
  };

  const installed = Boolean(app?.installed && app.installation);
  const pending = app?.installation
    ? PENDING_STATUSES.has(app.installation.status)
    : false;
  const suspended =
    app?.installation?.status === AppInstallationStatus.Suspended;
  const orgName = getParam("orgName") ?? "";
  const storeName = getParam("storeName") ?? "";
  const openHref =
    app &&
    app.installation?.status === AppInstallationStatus.Active
      ? createAdminAppPath({
          orgName,
          storeName,
          appCode: app.code,
        })
      : null;

  return (
    <ModalLayout
      header={
        <ModalHeader
          name="app-management"
          onClose={pop}
          submitButtonProps={null}
          title={app?.displayName ?? "App"}
        />
      }
      name="app-management"
    >
      {error ? (
        <Alert
          description={error.message}
          message="Unable to load app"
          showIcon
          type="error"
        />
      ) : null}
      {installError || lifecycleError ? (
        <Alert
          description={(installError ?? lifecycleError)?.message}
          message="Unable to update app"
          showIcon
          type="error"
        />
      ) : null}

      {loading && !app ? (
        <Paper>
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </Paper>
      ) : app ? (
        <>
          <AppSummary app={app} openHref={openHref} />
          <AccessAndCapabilities app={app} />
          {installed ? <AppHistory app={app} /> : null}

          {installed ? (
            <>
              {suspended ? (
                <Paper>
                  <PaperHeader title="App controls" />
                  <div className={styles.controlRow}>
                    <div className={styles.controlCopy}>
                      <Typography.Text strong>Resume app</Typography.Text>
                      <Typography.Text type="secondary">
                        Restore this app and its store access.
                      </Typography.Text>
                    </div>
                    <Button
                      disabled={pending}
                      loading={lifecycleLoading}
                      onClick={() => void runLifecycleAction("resume")}
                      size="small"
                    >
                      Resume
                    </Button>
                  </div>
                </Paper>
              ) : null}
              <Paper className={styles.dangerPaper}>
                <PaperHeader title="Danger zone" />
                <div className={styles.dangerRows}>
                  {!suspended ? (
                    <div className={styles.dangerRow}>
                      <div className={styles.controlCopy}>
                        <Typography.Text strong>
                          Suspend app
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          Temporarily disable this app without uninstalling it.
                        </Typography.Text>
                      </div>
                      <Button
                        danger
                        disabled={pending}
                        loading={lifecycleLoading}
                        onClick={() => void suspend()}
                        size="small"
                      >
                        Suspend
                      </Button>
                    </div>
                  ) : null}
                  <div className={styles.dangerRow}>
                    <div className={styles.controlCopy}>
                      <Typography.Text strong>
                        Uninstall app
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Remove this app and revoke its access to the store.
                      </Typography.Text>
                    </div>
                    <Button
                      danger
                      disabled={pending}
                      loading={lifecycleLoading}
                      onClick={() => void uninstall()}
                      size="small"
                    >
                      Uninstall
                    </Button>
                  </div>
                </div>
              </Paper>
            </>
          ) : (
            <Flex justify="end">
              <Button
                disabled={app.runtimeStatus !== AppRuntimeStatus.Ready}
                loading={installing}
                onClick={confirmInstall}
                type="primary"
              >
                Install app
              </Button>
            </Flex>
          )}
        </>
      ) : (
        <Paper>
          <Empty description="App not found" />
        </Paper>
      )}
    </ModalLayout>
  );
};
