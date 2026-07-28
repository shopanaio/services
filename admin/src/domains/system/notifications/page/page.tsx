"use client";

import { Alert, Empty, Skeleton } from "antd";
import { createStyles } from "antd-style";
import { useRouter } from "next/navigation";
import type { ApiAppWhereInput } from "@/graphql/types";
import { AppRow } from "@/domains/apps/management/components";
import { useAppsManagement } from "@/domains/apps/management/hooks";
import { useAppManagementModal } from "@/domains/apps/management/modals";
import { DataLayout } from "@/layouts/data";
import { usePathParams } from "@/registry";
import {
  GroupedLinkItem,
  GroupedLinkItemDivider,
} from "@/ui-kit/grouped-link-item";
import { Paper } from "@/ui-kit/paper";

const DELIVERY_APPS_WHERE = {
  installed: { _eq: true },
  capabilities: { _contains: "notifications" },
} satisfies ApiAppWhereInput;

const useStyles = createStyles(({ css, token }) => ({
  content: {
    width: "100%",
    maxWidth: 820,
    marginInline: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingBottom: 16,
  },
  deliveryPaper: css`
    padding: 0;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  `,
  deliveryHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    height: 50,
    paddingInline: 16,
    color: token.colorText,
    fontSize: 14,
    fontWeight: token.fontWeightStrong,
    lineHeight: "22px",
  },
  appList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  groupedPaper: css`
    padding: 8px 0;
    overflow: hidden;
    border-color: ${token.colorBorder};
    border-radius: ${token.borderRadiusLG + 4}px;
    box-shadow: none;
  `,
  state: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    paddingInline: token.padding,
  },
  skeleton: {
    padding: "10px 16px",
  },
}));

export default function NotificationSettingsPage() {
  const { styles } = useStyles();
  const router = useRouter();
  const { resolvePath } = usePathParams();
  const { apps, loading, error } = useAppsManagement(DELIVERY_APPS_WHERE);
  const { push: openAppModal } = useAppManagementModal();
  const deliveryApps = apps.filter((app) =>
    app.capabilities.some(
      (capability) =>
        capability.key === "notifications" &&
        capability.operations.some((operation) => operation.name === "deliver"),
    ),
  );

  return (
    <DataLayout fullWidth name="notifications" title="Notifications">
      <main className={styles.content}>
        {error ? (
          <Alert
            description={error.message}
            message="Unable to load message delivery apps"
            showIcon
            type="error"
          />
        ) : null}

        <Paper className={styles.deliveryPaper}>
          <div className={styles.deliveryHeader}>Message delivery</div>
          <GroupedLinkItemDivider />
          {loading && deliveryApps.length === 0 ? (
            <div className={styles.skeleton}>
              <Skeleton active avatar paragraph={{ rows: 1 }} title />
            </div>
          ) : deliveryApps.length > 0 ? (
            <ul className={styles.appList}>
              {deliveryApps.map((app) => (
                <AppRow
                  app={app}
                  key={app.code}
                  onOpen={() => openAppModal({ appCode: app.code })}
                />
              ))}
            </ul>
          ) : (
            <div className={styles.state}>
              <Empty
                description="No delivery apps are installed"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          )}
        </Paper>

        <Paper className={styles.groupedPaper}>
          <GroupedLinkItem
            ariaLabel="Open customer notifications"
            description="Notify customers about order and account events"
            onClick={() =>
              router.push(
                resolvePath(
                  "/:orgName/:storeName/system/notifications/customer",
                ),
              )
            }
            title="Customer notifications"
          />
          <GroupedLinkItemDivider />
          <GroupedLinkItem
            ariaLabel="Open staff notifications"
            description="Notify staff members about new order events"
            onClick={() =>
              router.push(
                resolvePath(
                  "/:orgName/:storeName/system/notifications/staff",
                ),
              )
            }
            title="Staff notifications"
          />
        </Paper>

        <Paper className={styles.groupedPaper}>
          <GroupedLinkItem
            ariaLabel="Open webhooks"
            description="Send XML or JSON notifications about store events to a URL"
            onClick={() =>
              router.push(
                resolvePath(
                  "/:orgName/:storeName/system/notifications/webhooks",
                ),
              )
            }
            title="Webhooks"
          />
        </Paper>
      </main>
    </DataLayout>
  );
}
