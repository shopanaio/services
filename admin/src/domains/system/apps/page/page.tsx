"use client";

import { type ReactNode } from "react";
import {
  Alert,
  Empty,
  Skeleton,
} from "antd";
import { createStyles } from "antd-style";
import type { ManagementAppListItem } from "@/domains/apps/management/graphql/operation-types";
import { AppRow } from "@/domains/apps/management/components";
import { useAppsManagement } from "@/domains/apps/management/hooks";
import { useAppManagementModal } from "@/domains/apps/management/modals";
import { DataLayout } from "@/layouts/data";
import { Paper } from "@/ui-kit/paper";

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
