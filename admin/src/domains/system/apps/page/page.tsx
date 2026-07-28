"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import {
  Alert,
  App,
  Avatar,
  Button,
  Empty,
  Modal,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import {
  LuChevronRight as RightOutlined,
  LuEllipsis as MoreOutlined,
} from "react-icons/lu";
import {
  AppInstallationStatus,
  AppRuntimeStatus,
} from "@/graphql/types";
import type { ManagementAppListItem } from "@/domains/apps/management/graphql/operation-types";
import {
  useAppsManagement,
  useInstallApp,
} from "@/domains/apps/management/hooks";
import { DataLayout } from "@/layouts/data";
import { usePathParams } from "@/registry";
import { Paper } from "@/ui-kit/paper";

const APP_AVATAR_COLORS = [
  "#598cf5",
  "#6eb84a",
  "#876bd1",
  "#dc6f5e",
  "#36a3a0",
] as const;

const useStyles = createStyles(({ css, token }) => ({
  content: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: 820,
    marginInline: "auto",
    paddingTop: 12,
    paddingBottom: 40,
  },
  pageHeader: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 66,
    marginBottom: 14,
  },
  pageTitle: css`
    && {
      margin: 0;
      color: ${token.colorTextHeading};
      font-size: 24px;
      font-weight: ${token.fontWeightStrong};
      line-height: 32px;
    }
  `,
  pageDescription: {
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: "20px",
  },
  paper: css`
    padding: 0;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  `,
  papers: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  paperHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
    padding: "5px 10px 5px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  paperCopy: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minWidth: 0,
  },
  paperTitle: {
    color: token.colorText,
    fontSize: 14,
    fontWeight: token.fontWeightStrong,
    lineHeight: "22px",
  },
  paperSubtitle: {
    overflow: "hidden",
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: "18px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  moreButton: css`
    && {
      width: 32px;
      height: 32px;
      padding: 0;
      color: ${token.colorText};
      background: ${token.colorBgContainerDisabled};
    }

    && svg {
      width: 16px;
      height: 16px;
    }
  `,
  appList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  appListItem: {
    boxSizing: "border-box",
    height: 64,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": {
      borderBottom: 0,
    },
  },
  appRow: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 16,
    height: 64,
    padding: "10px 16px",
    color: "inherit",
    background: token.colorBgContainer,
    textDecoration: "none",
  },
  appRowInteractive: {
    transition: `background-color ${token.motionDurationMid}`,
    "&:hover": {
      background: token.colorFillQuaternary,
    },
    "&:focus-visible": {
      outline: `2px solid ${token.colorPrimaryBorder}`,
      outlineOffset: -2,
    },
  },
  avatar: {
    flex: "0 0 auto",
    width: 40,
    height: 40,
    borderRadius: token.borderRadiusLG,
    fontSize: 14,
    lineHeight: "40px",
  },
  appCopy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  appName: {
    overflow: "hidden",
    color: token.colorText,
    fontSize: 13,
    fontWeight: token.fontWeightStrong,
    lineHeight: "20px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  appDescription: {
    overflow: "hidden",
    color: token.colorTextSecondary,
    fontSize: 11,
    lineHeight: "18px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chevron: {
    flex: "0 0 auto",
    width: 14,
    height: 14,
    color: token.colorText,
  },
  installButton: {
    minWidth: 72,
  },
  statusTag: {
    flex: "0 0 auto",
    marginInlineEnd: 0,
    textTransform: "capitalize",
  },
  state: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 128,
    padding: token.paddingLG,
  },
  skeleton: {
    padding: "12px 16px",
  },
  help: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    marginTop: 32,
    color: token.colorLink,
    fontSize: 13,
    lineHeight: "20px",
  },
  permissionIntro: {
    display: "block",
    marginBottom: 12,
  },
  permissionList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  permissionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
}));

const getAvatarColor = (appCode: string) => {
  const hash = [...appCode].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return APP_AVATAR_COLORS[hash % APP_AVATAR_COLORS.length];
};

const formatStatus = (status: AppInstallationStatus) =>
  status.toLowerCase().replaceAll("_", " ");

function AppAvatar({ app }: { app: ManagementAppListItem }) {
  const { styles } = useStyles();

  return (
    <Avatar
      className={styles.avatar}
      shape="square"
      size={40}
      style={{ backgroundColor: getAvatarColor(app.code) }}
    >
      {app.displayName.trim().charAt(0).toUpperCase()}
    </Avatar>
  );
}

function AppCopy({ app }: { app: ManagementAppListItem }) {
  const { styles } = useStyles();

  return (
    <span className={styles.appCopy}>
      <span className={styles.appName}>{app.displayName}</span>
      <span className={styles.appDescription}>{app.description}</span>
    </span>
  );
}

function InstalledAppRow({
  app,
  href,
}: {
  app: ManagementAppListItem;
  href: string;
}) {
  const { styles, cx } = useStyles();
  const status = app.installation?.status;
  const isActive = status === AppInstallationStatus.Active;

  return (
    <li className={styles.appListItem}>
      {isActive ? (
        <Link
          aria-label={`Open ${app.displayName}`}
          className={cx(styles.appRow, styles.appRowInteractive)}
          href={href}
        >
          <AppAvatar app={app} />
          <AppCopy app={app} />
          <RightOutlined aria-hidden className={styles.chevron} />
        </Link>
      ) : (
        <div className={styles.appRow}>
          <AppAvatar app={app} />
          <AppCopy app={app} />
          {status ? (
            <Tag className={styles.statusTag} color="processing">
              {formatStatus(status)}
            </Tag>
          ) : null}
        </div>
      )}
    </li>
  );
}

function AvailableAppRow({
  app,
  installing,
  onInstall,
}: {
  app: ManagementAppListItem;
  installing: boolean;
  onInstall: (app: ManagementAppListItem) => void;
}) {
  const { styles } = useStyles();
  const available = app.runtimeStatus === AppRuntimeStatus.Ready;

  return (
    <li className={styles.appListItem}>
      <div className={styles.appRow}>
        <AppAvatar app={app} />
        <AppCopy app={app} />
        <Button
          className={styles.installButton}
          disabled={!available}
          loading={installing}
          onClick={() => onInstall(app)}
          size="small"
          type="primary"
        >
          {available ? "Install" : "Unavailable"}
        </Button>
      </div>
    </li>
  );
}

function AppPaper({
  apps,
  emptyDescription,
  loading,
  subtitle,
  title,
  actions,
  renderApp,
}: {
  apps: ManagementAppListItem[];
  emptyDescription: string;
  loading: boolean;
  subtitle: string;
  title: string;
  actions?: ReactNode;
  renderApp: (app: ManagementAppListItem) => ReactNode;
}) {
  const { styles } = useStyles();

  return (
    <Paper className={styles.paper}>
      <div className={styles.paperHeader}>
        <div className={styles.paperCopy}>
          <span className={styles.paperTitle}>{title}</span>
          <span className={styles.paperSubtitle}>{subtitle}</span>
        </div>
        {actions}
      </div>

      {loading && apps.length === 0 ? (
        <div className={styles.skeleton}>
          <Skeleton active avatar paragraph={{ rows: 1 }} title />
        </div>
      ) : apps.length > 0 ? (
        <ul className={styles.appList}>
          {apps.map((app) => renderApp(app))}
        </ul>
      ) : (
        <div className={styles.state}>
          <Empty
            description={emptyDescription}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )}
    </Paper>
  );
}

export default function SystemAppsPage() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { getParam } = usePathParams();
  const orgName = getParam("orgName") ?? "";
  const storeName = getParam("storeName") ?? "";
  const {
    installedApps,
    availableApps,
    loading,
    error,
    refetch,
  } = useAppsManagement();
  const { installApp, loading: installing } = useInstallApp();
  const [selectedApp, setSelectedApp] =
    useState<ManagementAppListItem | null>(null);
  const appBaseUrl = `/${encodeURIComponent(orgName)}/${encodeURIComponent(
    storeName,
  )}/apps`;

  const confirmInstallation = async () => {
    if (!selectedApp) return;

    const result = await installApp({
      appCode: selectedApp.code,
      clientMutationId: crypto.randomUUID(),
      grantedScopes: selectedApp.permissions.map(({ scope }) => scope),
    });

    if (result.userErrors.length > 0) {
      message.error(
        result.userErrors
          .map(({ message: errorMessage }) => errorMessage)
          .join("\n"),
      );
      return;
    }

    setSelectedApp(null);
    message.success(`${selectedApp.displayName} installation started`);
  };

  return (
    <DataLayout fullWidth name="apps">
      <main className={styles.content}>
        <header className={styles.pageHeader}>
          <Typography.Title className={styles.pageTitle} level={1}>
            Apps
          </Typography.Title>
          <Typography.Text className={styles.pageDescription}>
            Manage installed apps and develop custom integrations for your
            store.
          </Typography.Text>
        </header>

        {error ? (
          <Alert
            description={error.message}
            message="Unable to load apps"
            showIcon
            type="error"
          />
        ) : (
          <div className={styles.papers}>
            <AppPaper
              actions={
                <Button
                  aria-label="Refresh apps"
                  className={styles.moreButton}
                  disabled={loading}
                  icon={<MoreOutlined />}
                  onClick={() => void refetch()}
                />
              }
              apps={installedApps}
              emptyDescription="No apps are installed for this store"
              loading={loading}
              renderApp={(app) => (
                <InstalledAppRow
                  app={app}
                  href={`${appBaseUrl}/${encodeURIComponent(app.code)}`}
                  key={app.code}
                />
              )}
              subtitle="Apps connected to this store"
              title="Installed apps"
            />
            <AppPaper
              apps={availableApps}
              emptyDescription="All available apps are installed"
              loading={loading}
              renderApp={(app) => (
                <AvailableAppRow
                  app={app}
                  installing={installing && selectedApp?.code === app.code}
                  key={app.code}
                  onInstall={setSelectedApp}
                />
              )}
              subtitle="Apps available for this store"
              title="Available apps"
            />
          </div>
        )}

        <Typography.Text className={styles.help}>
          Learn more about apps
        </Typography.Text>
      </main>

      <Modal
        cancelButtonProps={{ disabled: installing }}
        cancelText="Cancel"
        confirmLoading={installing}
        destroyOnHidden
        okText="Install app"
        onCancel={() => setSelectedApp(null)}
        onOk={confirmInstallation}
        open={selectedApp !== null}
        title={selectedApp ? `Install ${selectedApp.displayName}?` : "Install app"}
      >
        {selectedApp ? (
          <>
            <Typography.Text className={styles.permissionIntro}>
              {selectedApp.permissions.length > 0
                ? "This app requests the following permissions:"
                : "This app does not request additional permissions."}
            </Typography.Text>
            {selectedApp.permissions.length > 0 ? (
              <ul className={styles.permissionList}>
                {selectedApp.permissions.map(({ scope }) => (
                  <li className={styles.permissionItem} key={scope}>
                    <Typography.Text code>{scope}</Typography.Text>
                    <Tag color="blue">Requested</Tag>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </Modal>
    </DataLayout>
  );
}
