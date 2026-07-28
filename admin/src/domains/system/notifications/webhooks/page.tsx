"use client";

import { Alert, Skeleton } from "antd";
import { createStyles } from "antd-style";
import { DataLayout } from "@/layouts/data";
import { GroupedLinkItem } from "@/ui-kit/grouped-link-item";
import { Paper } from "@/ui-kit/paper";
import { useWebhookSecret } from "../hooks";
import { useNotificationItemModal } from "../modals";

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
  const { push: openItemModal } = useNotificationItemModal();
  const webhookSecret = useWebhookSecret();
  const userErrorMessage = webhookSecret.userErrors
    .map(({ message }) => message)
    .join("\n");

  return (
    <DataLayout fullWidth name="webhooks" title="Webhooks">
      <main className={styles.content}>
        {webhookSecret.error || userErrorMessage ? (
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
            onClick={() => openItemModal({ title: "Create webhook" })}
            title="Create webhook"
          />
          <p className={styles.secret}>
            Your webhooks will be signed with
            {webhookSecret.loading ? (
              <Skeleton.Input active block size="small" />
            ) : (
              <span className={styles.secretValue}>
                {webhookSecret.secret ?? "Unavailable"}
              </span>
            )}
          </p>
        </Paper>
      </main>
    </DataLayout>
  );
}
