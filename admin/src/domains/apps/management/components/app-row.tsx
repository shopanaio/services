"use client";

import { Avatar, Skeleton, Tag } from "antd";
import { createStyles } from "antd-style";
import { LuChevronRight as RightOutlined } from "react-icons/lu";
import {
  AppInstallationStatus,
  AppRuntimeStatus,
} from "@/graphql/types";
import type { ManagementAppListItem } from "../graphql/operation-types";

const useStyles = createStyles(({ token }) => ({
  item: {
    boxSizing: "border-box",
    height: 64,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": {
      borderBottom: 0,
    },
  },
  row: {
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
  copy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  name: {
    overflow: "hidden",
    color: token.colorText,
    fontSize: 13,
    fontWeight: token.fontWeightStrong,
    lineHeight: "20px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  description: {
    overflow: "hidden",
    color: token.colorTextSecondary,
    fontSize: 11,
    lineHeight: "18px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  status: {
    flex: "0 0 auto",
    marginInlineEnd: 0,
    textTransform: "capitalize",
  },
  chevron: {
    flex: "0 0 auto",
    width: 14,
    height: 14,
    color: token.colorText,
  },
  skeletonName: {
    width: 132,
    minWidth: 0,
    height: 12,
    marginBlock: 4,
  },
  skeletonDescription: {
    width: 220,
    maxWidth: "100%",
    minWidth: 0,
    height: 10,
    marginBlock: 4,
  },
  skeletonStatus: {
    width: 64,
    minWidth: 64,
    height: 22,
  },
  skeletonChevron: {
    flex: "0 0 auto",
    width: 14,
    minWidth: 14,
    height: 14,
  },
  skeletonRow: {
    cursor: "default",
    "&:hover": {
      background: token.colorBgContainer,
    },
  },
}));

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

export interface AppRowProps {
  app: ManagementAppListItem;
  onOpen: (app: ManagementAppListItem) => void;
}

export function AppRow({ app, onOpen }: AppRowProps) {
  const { styles } = useStyles();
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
    <li className={styles.item}>
      <button
        aria-label={`View ${app.displayName}`}
        className={styles.row}
        onClick={() => onOpen(app)}
        type="button"
      >
        <Avatar
          alt={app.icon.alt}
          className={styles.avatar}
          shape="square"
          size={40}
          src={app.icon.url}
        />
        <span className={styles.copy}>
          <span className={styles.name}>{app.displayName}</span>
          <span className={styles.description}>{app.description}</span>
        </span>
        <Tag className={styles.status} color={status.color}>
          {status.label}
        </Tag>
        <RightOutlined aria-hidden className={styles.chevron} />
      </button>
    </li>
  );
}

export function AppRowSkeleton() {
  const { styles } = useStyles();

  return (
    <li aria-hidden className={styles.item}>
      <div className={`${styles.row} ${styles.skeletonRow}`}>
        <Skeleton.Avatar
          active
          className={styles.avatar}
          shape="square"
          size={40}
        />
        <span className={styles.copy}>
          <Skeleton.Input active className={styles.skeletonName} />
          <Skeleton.Input active className={styles.skeletonDescription} />
        </span>
        <Skeleton.Button
          active
          className={styles.skeletonStatus}
          size="small"
        />
        <Skeleton.Avatar
          active
          className={styles.skeletonChevron}
          size={14}
        />
      </div>
    </li>
  );
}
