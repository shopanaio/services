"use client";

import { createStyles } from "antd-style";
import { NotificationAudience } from "@/graphql/types";
import { DataLayout } from "@/layouts/data";
import {
  NotificationPageState,
  NotificationSection,
} from "../components";
import { CUSTOMER_NOTIFICATION_SECTIONS } from "../constants";
import { useNotificationSettings } from "../hooks";
import { useNotificationTemplateModal } from "../modals";

const useStyles = createStyles(() => ({
  content: {
    width: "100%",
    maxWidth: 820,
    marginInline: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingBottom: 16,
  },
}));

export default function CustomerNotificationsPage() {
  const { styles } = useStyles();
  const settings = useNotificationSettings();
  const { push: openTemplateModal } = useNotificationTemplateModal();
  const definitions = settings.definitions.filter(
    ({ audience }) => audience === NotificationAudience.Customer,
  );

  return (
    <DataLayout
      fullWidth
      loading={settings.loading && definitions.length === 0}
      name="customer-notifications"
      title="Customer notifications"
    >
      <main className={styles.content}>
        <NotificationPageState
          error={settings.error}
          loading={settings.loading && definitions.length === 0}
        />
        {CUSTOMER_NOTIFICATION_SECTIONS.map((section) => (
          <NotificationSection
            definitions={definitions}
            key={section.title}
            onOpen={(item, definition) =>
              openTemplateModal({
                definitionKey: item.key,
                title: item.title,
                allowedChannels: definition?.allowedChannels ?? [],
                variables: definition?.variables ?? [],
                onSaved: async () => {
                  await settings.refetch();
                },
              })
            }
            onToggle={settings.setDefinitionEnabled}
            section={section}
            updatingKeys={settings.updatingKeys}
          />
        ))}
      </main>
    </DataLayout>
  );
}
