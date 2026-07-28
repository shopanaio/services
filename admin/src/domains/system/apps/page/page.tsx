"use client";

import { type ReactNode } from "react";
import {
  Alert,
  Avatar,
  Empty,
  Skeleton,
  Tag,
} from "antd";
import { createStyles } from "antd-style";
import { LuChevronRight as RightOutlined } from "react-icons/lu";
import {
  AppInstallationStatus,
  AppRuntimeStatus,
} from "@/graphql/types";
import type { ManagementAppListItem } from "@/domains/apps/management/graphql/operation-types";
import { useAppsManagement } from "@/domains/apps/management/hooks";
import { useAppManagementModal } from "@/domains/apps/management/modals";
import { DataLayout } from "@/layouts/data";
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
    paddingBottom: 40,
  },
  paper: css`
    padding: 0;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
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
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 16,
    height: 64,
    padding: "10px 16px",
    color: "inherit",
    background: token.colorBgContainer,
    border: 0,
    cursor: "pointer",
    font: "inherit",
    textDecoration: "none",
    textAlign: "left",
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

const getStatusColor = (status: AppInstallationStatus) => {
  if (status === AppInstallationStatus.Active) return "success";
  if (
    status === AppInstallationStatus.InstallFailed ||
    status === AppInstallationStatus.UninstallFailed ||
    status === AppInstallationStatus.UpdateFailed
  ) {
    return "error";
  }
  if (
    status === AppInstallationStatus.Installing ||
    status === AppInstallationStatus.Resuming ||
    status === AppInstallationStatus.Suspending ||
    status === AppInstallationStatus.Uninstalling ||
    status === AppInstallationStatus.Updating
  ) {
    return "processing";
  }
  if (status === AppInstallationStatus.PendingConsent) return "warning";
  return "default";
};

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

function AppRow({
  app,
  onOpen,
}: {
  app: ManagementAppListItem;
  onOpen: (app: ManagementAppListItem) => void;
}) {
  const { styles, cx } = useStyles();
  const installationStatus = app.installation?.status;
  const isAvailable =
    !app.installed && app.runtimeStatus === AppRuntimeStatus.Ready;
  const status = installationStatus
    ? {
        color: getStatusColor(installationStatus),
        label: formatStatus(installationStatus),
      }
    : app.installed
      ? { color: "blue", label: "installed" }
      : isAvailable
        ? { color: "blue", label: "available" }
        : { color: "default", label: "unavailable" };

  return (
    <li className={styles.appListItem}>
      <button
        aria-label={`View ${app.displayName}`}
        className={cx(styles.appRow, styles.appRowInteractive)}
        onClick={() => onOpen(app)}
        type="button"
      >
        <AppAvatar app={app} />
        <AppCopy app={app} />
        <Tag className={styles.statusTag} color={status.color}>
          {status.label}
        </Tag>
        <RightOutlined aria-hidden className={styles.chevron} />
      </button>
    </li>
  );
}

function AppPaper({
  apps,
  emptyDescription,
  loading,
  renderApp,
}: {
  apps: ManagementAppListItem[];
  emptyDescription: string;
  loading: boolean;
  renderApp: (app: ManagementAppListItem) => ReactNode;
}) {
  const { styles } = useStyles();

  return (
    <Paper className={styles.paper}>
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
  const { apps, loading, error } = useAppsManagement();
  const { push: openAppModal } = useAppManagementModal();

  return (
    <DataLayout fullWidth name="apps" title="Apps">
      <main className={styles.content}>
        {error ? (
          <Alert
            description={error.message}
            message="Unable to load apps"
            showIcon
            type="error"
          />
        ) : (
          <AppPaper
            apps={apps}
            emptyDescription="No apps are available for this store"
            loading={loading}
            renderApp={(app) => (
              <AppRow
                app={app}
                key={app.code}
                onOpen={() => openAppModal({ appCode: app.code })}
              />
            )}
          />
        )}
      </main>
    </DataLayout>
  );
}
