"use client";

import { createStyles } from "antd-style";
import { useRouter } from "next/navigation";
import { NotificationAudience } from "@/graphql/types";
import { DataLayout } from "@/layouts/data";
import { usePathParams } from "@/registry";
import {
  NotificationPageState,
  NotificationRecipientsSection,
  NotificationSection,
} from "../components";
import { STAFF_NOTIFICATION_SECTIONS } from "../constants";
import { useNotificationSettings } from "../hooks";
import {
  useNotificationItemModal,
  useNotificationTemplateModal,
} from "../modals";

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

export default function StaffNotificationsPage() {
  const { styles } = useStyles();
  const router = useRouter();
  const { resolvePath } = usePathParams();
  const settings = useNotificationSettings();
  const { push: openItemModal } = useNotificationItemModal();
  const { push: openTemplateModal } = useNotificationTemplateModal();
  const definitions = settings.definitions.filter(
    ({ audience }) => audience === NotificationAudience.Staff,
  );

  return (
    <DataLayout
      fullWidth
      loading={settings.loading && definitions.length === 0}
      name="staff-notifications"
      onBack={() =>
        router.push(resolvePath("/:orgName/:storeName/system/notifications"))
      }
      title="Staff notifications"
    >
      <main className={styles.content}>
        <NotificationPageState
          error={settings.error}
          loading={settings.loading && definitions.length === 0}
        />
        {STAFF_NOTIFICATION_SECTIONS.map((section) => (
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
        <NotificationRecipientsSection
          onOpen={(title) => openItemModal({ title })}
          recipients={settings.staffRecipients}
        />
      </main>
    </DataLayout>
  );
}
