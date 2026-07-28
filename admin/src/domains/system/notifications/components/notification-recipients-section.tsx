"use client";

import { createStyles } from "antd-style";
import type { ApiStaffNotificationRecipient } from "@/graphql/types";
import {
  GroupedLinkItem,
  GroupedLinkItemDivider,
} from "@/ui-kit/grouped-link-item";
import { Paper, PaperHeader } from "@/ui-kit/paper";

const useStyles = createStyles(({ css, token }) => ({
  paper: css`
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow:
      inset 0 0 0 1px ${token.colorBorderSecondary},
      0 2px 8px rgb(0 0 0 / 8%);
  `,
  itemDivider: {
    position: "relative",
    zIndex: 3,
    marginBottom: -1,
  },
}));

const formatScope = (scope: string) =>
  scope
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (character) => character.toUpperCase());

export function NotificationRecipientsSection({
  recipients,
  onOpen,
}: {
  recipients: ApiStaffNotificationRecipient[];
  onOpen: (title: string) => void;
}) {
  const { styles } = useStyles();

  return (
    <Paper className={styles.paper}>
      <PaperHeader contained title="Recipients" />
      {recipients.map((recipient) => {
        const title = `${recipient.name} · ${recipient.email}`;

        return (
          <div key={recipient.id}>
            <GroupedLinkItem
              ariaLabel={`Open ${recipient.name}`}
              description={formatScope(recipient.scope)}
              onClick={() => onOpen(title)}
              title={title}
            />
            <GroupedLinkItemDivider className={styles.itemDivider} />
          </div>
        );
      })}
      <GroupedLinkItem
        ariaLabel="Add recipient"
        description="Add another notification recipient"
        onClick={() => onOpen("Add recipient")}
        title="Add recipient"
      />
    </Paper>
  );
}
