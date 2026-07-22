"use client";

import { useState } from "react";
import { Alert, App } from "antd";
import { createStyles } from "antd-style";
import { DataLayout } from "@/layouts/data";
import {
  StoreContactDetailsCard,
  StoreCurrencyCard,
  StoreDefaultsCard,
  StoreLanguagesCard,
  CustomerAccountsCard,
  StoreOrderProcessingCard,
  StoreDangerZoneCard,
} from "../components";
import { useGeneralSettings, useLanguageSettingsMutations } from "../hooks";
import {
  type StoreSettingsSection,
  useAddStoreLanguageModal,
  useEditStoreCurrencyModal,
  useEditStoreDefaultsModal,
  useEditStoreSettingsModal,
  useEditCustomerAccountsModal,
  useEditStoreOrderProcessingModal,
} from "../modals";
import type { CustomerAuthenticationMethod } from "../types";

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

export default function GeneralSettingsPage() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { store, loading, error, refetch } = useGeneralSettings();
  const editStoreSettingsModal = useEditStoreSettingsModal();
  const editStoreDefaultsModal = useEditStoreDefaultsModal();
  const editStoreCurrencyModal = useEditStoreCurrencyModal();
  const addStoreLanguageModal = useAddStoreLanguageModal();
  const languageMutations = useLanguageSettingsMutations();
  const editCustomerAccountsModal = useEditCustomerAccountsModal();
  const [customerAuthenticationMethods, setCustomerAuthenticationMethods] =
    useState<CustomerAuthenticationMethod[]>(["password"]);
  const editOrderProcessingModal = useEditStoreOrderProcessingModal();

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

  const openLanguageEditor = () => {
    if (!store) return;
    addStoreLanguageModal.push({ store, onSaved: refetch });
  };

  const openCustomerAccountsEditor = () => {
    editCustomerAccountsModal.push({
      enabledMethods: customerAuthenticationMethods,
      onSave: setCustomerAuthenticationMethods,
    });
  };

  const openOrderProcessingEditor = () => {
    if (!store) return;
    editOrderProcessingModal.push({ store, onSaved: refetch });
  };

  const setDefaultLanguage = async (locale: Parameters<typeof languageMutations.setDefaultLanguage>[0]) => {
    const result = await languageMutations.setDefaultLanguage(locale);
    if (!result.success || result.userErrors.length > 0) {
      message.error(
        result.userErrors.map(({ message: errorMessage }) => errorMessage).join("\n") ||
          languageMutations.error?.message ||
          "The default language could not be changed.",
      );
      return;
    }
    await refetch();
    message.success("Default language updated");
  };

  const deleteLanguage = async (code: Parameters<typeof languageMutations.deleteLanguage>[0]) => {
    const result = await languageMutations.deleteLanguage(code);
    if (!result.deletedLocaleCode || result.userErrors.length > 0) {
      message.error(
        result.userErrors.map(({ message: errorMessage }) => errorMessage).join("\n") ||
          languageMutations.error?.message ||
          "The language could not be deleted.",
      );
      return;
    }
    await refetch();
    message.success("Language deleted");
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
            <StoreLanguagesCard
              loading={languageMutations.deleting || languageMutations.settingDefault}
              onAdd={openLanguageEditor}
              onDelete={deleteLanguage}
              onSetDefault={setDefaultLanguage}
              store={store}
            />
            <CustomerAccountsCard
              enabledMethods={customerAuthenticationMethods}
              onEdit={openCustomerAccountsEditor}
            />
            <StoreOrderProcessingCard
              onEdit={openOrderProcessingEditor}
              store={store}
            />
            <StoreDangerZoneCard store={store} />
          </>
        ) : null}
      </div>
    </DataLayout>
  );
}
