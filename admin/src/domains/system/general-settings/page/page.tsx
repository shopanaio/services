"use client";

import { Alert } from "antd";
import { createStyles } from "antd-style";
import { DataLayout } from "@/layouts/data";
import { StoreContactDetailsCard } from "../components";
import { useGeneralSettings } from "../hooks";
import {
  type StoreSettingsSection,
  useEditStoreSettingsModal,
} from "../modals";

const useStyles = createStyles(() => ({
  content: {
    width: "100%",
    maxWidth: 820,
    marginInline: "auto",
  },
}));

export default function GeneralSettingsPage() {
  const { styles } = useStyles();
  const { store, loading, error, refetch } = useGeneralSettings();
  const editStoreSettingsModal = useEditStoreSettingsModal();

  const openEditor = (section: StoreSettingsSection) => {
    if (!store) return;
    editStoreSettingsModal.push({ section, store, onSaved: refetch });
  };

  return (
    <DataLayout
      fullWidth
      loading={loading && !store}
      name="general-settings"
      title="General settings"
    >
      <div className={styles.content}>
        {error ? (
          <Alert
            message="Unable to load general settings"
            description={error.message}
            showIcon
            type="error"
          />
        ) : null}
        {store ? (
          <StoreContactDetailsCard onEdit={openEditor} store={store} />
        ) : null}
      </div>
    </DataLayout>
  );
}
