"use client";

import { Alert } from "antd";
import { createStyles } from "antd-style";
import { DataLayout } from "@/layouts/data";
import {
  StoreContactDetailsCard,
  StoreCurrencyCard,
  StoreDefaultsCard,
} from "../components";
import { useGeneralSettings } from "../hooks";
import {
  type StoreSettingsSection,
  useEditStoreCurrencyModal,
  useEditStoreDefaultsModal,
  useEditStoreSettingsModal,
} from "../modals";

const useStyles = createStyles(() => ({
  content: {
    width: "100%",
    maxWidth: 820,
    marginInline: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
}));

export default function GeneralSettingsPage() {
  const { styles } = useStyles();
  const { store, loading, error, refetch } = useGeneralSettings();
  const editStoreSettingsModal = useEditStoreSettingsModal();
  const editStoreDefaultsModal = useEditStoreDefaultsModal();
  const editStoreCurrencyModal = useEditStoreCurrencyModal();

  const openEditor = (section: StoreSettingsSection) => {
    if (!store) return;
    editStoreSettingsModal.push({ section, store, onSaved: refetch });
  };

  const openDefaultsEditor = () => {
    if (!store) return;
    editStoreDefaultsModal.push({ store, onSaved: refetch });
  };

  const openCurrencyEditor = () => {
    if (!store) return;
    editStoreCurrencyModal.push({ store, onSaved: refetch });
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
          <>
            <StoreContactDetailsCard onEdit={openEditor} store={store} />
            <StoreCurrencyCard onEdit={openCurrencyEditor} store={store} />
            <StoreDefaultsCard onEdit={openDefaultsEditor} store={store} />
          </>
        ) : null}
      </div>
    </DataLayout>
  );
}
