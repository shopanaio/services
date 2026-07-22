"use client";

import { Alert } from "antd";
import { createStyles } from "antd-style";
import { useCallback } from "react";
import { DataLayout } from "@/layouts/data";
import {
  StoreCurrencies,
  StoreDangerZone,
  StoreInformation,
  StoreLanguages,
  StoreLocation,
  StoreUnits,
} from "../components";
import { useGeneralSettings } from "../hooks";

const useStyles = createStyles(({ token }) => ({
  sections: {
    display: "flex",
    flexDirection: "column",
    gap: token.margin,
    paddingBottom: token.padding,
  },
}));

export default function GeneralSettingsPage() {
  const { styles } = useStyles();
  const { error, loading, locales, refetch, store } = useGeneralSettings();
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DataLayout loading={loading} name="general-settings" title="General">
      <DataLayout.Content>
        {error ? (
          <Alert message={error.message} showIcon type="error" />
        ) : null}
        <div className={styles.sections}>
          <StoreInformation onSaved={refresh} store={store} />
          <StoreLocation store={store} />
          <StoreLanguages
            defaultLocale={store.defaultLocale}
            locales={locales}
            onSaved={refresh}
          />
          <StoreCurrencies currencyCode={store.currencyCode} />
          <StoreUnits
            dimensionUnit={store.defaultDimensionUnit}
            weightUnit={store.defaultWeightUnit}
          />
          <StoreDangerZone store={store} />
        </div>
      </DataLayout.Content>
    </DataLayout>
  );
}
