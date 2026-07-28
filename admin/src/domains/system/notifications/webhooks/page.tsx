"use client";

import { Alert, Skeleton } from "antd";
import { createStyles } from "antd-style";
import { useRouter } from "next/navigation";
import { DataLayout } from "@/layouts/data";
import { usePathParams } from "@/registry";
import {
  GroupedLinkItem,
  GroupedLinkItemDivider,
} from "@/ui-kit/grouped-link-item";
import { Paper } from "@/ui-kit/paper";
import { useWebhookSecret, useWebhooks } from "../hooks";
import { useNotificationWebhookModal } from "../modals";

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
  card: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    border: 0;
    border-radius: ${token.borderRadiusLG + 4}px;
    box-shadow: inset 0 0 0 1px ${token.colorBorder};
  `,
  intro: {
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: 14,
    lineHeight: 1.4,
  },
  secret: {
    margin: 0,
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: 1.25,
  },
  secretValue: {
    display: "block",
    overflowWrap: "anywhere",
  },
}));

export default function WebhooksPage() {
  const { styles } = useStyles();
  const router = useRouter();
  const { resolvePath } = usePathParams();
  const { push: openWebhookModal } = useNotificationWebhookModal();
  const webhooksQuery = useWebhooks();
  const webhookSecret = useWebhookSecret();
  const userErrorMessage = webhookSecret.userErrors
    .map(({ message }) => message)
    .join("\n");

  return (
    <DataLayout
      fullWidth
      name="webhooks"
      onBack={() =>
        router.push(resolvePath("/:orgName/:storeName/system/notifications"))
      }
      title="Webhooks"
    >
      <main className={styles.content}>
        {webhooksQuery.error ? (
          <Alert
            description={webhooksQuery.error.message}
            message="Unable to load webhooks"
            showIcon
            type="error"
          />
        ) : null}
        {webhooksQuery.webhooks.length > 0 &&
        (webhookSecret.error || userErrorMessage) ? (
          <Alert
            description={webhookSecret.error?.message ?? userErrorMessage}
            message="Unable to reveal the webhook signing secret"
            showIcon
            type="error"
          />
        ) : null}

        <Paper className={styles.card}>
          <p className={styles.intro}>
            Send XML or JSON notifications about store events to a URL
          </p>
          <GroupedLinkItem
            ariaLabel="Create webhook"
            description="Add a new event endpoint"
            onClick={() =>
              openWebhookModal({
                onSaved: async () => {
                  await webhookSecret.revealSecret();
                },
              })
            }
            title="Create webhook"
          />
          {webhooksQuery.loading && webhooksQuery.webhooks.length === 0 ? (
            <Skeleton active paragraph={{ rows: 1 }} title />
          ) : (
            webhooksQuery.webhooks.map((webhook) => {
              const eventTitle =
                webhooksQuery.capabilities?.events.find(
                  (event) => event.eventType === webhook.eventType,
                )?.title ?? webhook.eventType;

              return (
                <div key={webhook.id}>
                  <GroupedLinkItemDivider />
                  <GroupedLinkItem
                    ariaLabel={`Edit ${eventTitle} webhook`}
                    description={`${webhook.format} · ${webhook.url}`}
                    onClick={() => openWebhookModal({ webhook })}
                    title={eventTitle}
                  />
                </div>
              );
            })
          )}
          <p className={styles.secret}>
            Your webhooks will be signed with
            {webhookSecret.loading ? (
              <Skeleton.Input active block size="small" />
            ) : (
              <span className={styles.secretValue}>
                {webhookSecret.secret ??
                  (webhooksQuery.webhooks.length === 0
                    ? "Created after the first webhook"
                    : "Unavailable")}
              </span>
            )}
          </p>
        </Paper>
      </main>
    </DataLayout>
  );
}
