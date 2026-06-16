"use client";

import { useState, useCallback } from "react";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { SettingsTab } from "./components";
import type {
  IBundleSettings,
  DisplayStyle,
  OutOfStockBehavior,
} from "@/domains/promos/bundles/types";

// ============================================================================
// Payload
// ============================================================================

export interface IEditSettingsModalPayload {
  settings: IBundleSettings;
  onSave?: (settings: IBundleSettings) => void;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_BUNDLE_SETTINGS: IBundleSettings = {
  displayStyle: "accordion",
  showImages: true,
  showSku: true,
  showStock: true,
  showComparePrice: false,
  outOfStockBehavior: "disable",
  inheritStock: true,
  validationMessage: null,
};

// ============================================================================
// Component
// ============================================================================

export const EditSettingsModal = () => {
  const { pop, setDirty, payload } = useModalStackContext();

  const modalPayload = payload as unknown as IEditSettingsModalPayload | undefined;

  const [settings, setSettings] = useState<IBundleSettings>(
    modalPayload?.settings ?? DEFAULT_BUNDLE_SETTINGS
  );

  const updateSetting = useCallback(
    <K extends keyof IBundleSettings>(key: K, value: IBundleSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [setDirty]
  );

  const handleSave = useCallback(() => {
    modalPayload?.onSave?.(settings);
    pop();
  }, [settings, modalPayload, pop]);

  return (
    <ModalLayout
      name="edit-bundle-settings"
      header={
        <ModalHeader
          name="edit-bundle-settings"
          title="Edit Bundle Settings"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
      <SettingsTab
        displayStyle={settings.displayStyle}
        onDisplayStyleChange={(style: DisplayStyle) => updateSetting("displayStyle", style)}
        showImages={settings.showImages}
        onShowImagesChange={(value: boolean) => updateSetting("showImages", value)}
        showSku={settings.showSku}
        onShowSkuChange={(value: boolean) => updateSetting("showSku", value)}
        showStock={settings.showStock}
        onShowStockChange={(value: boolean) => updateSetting("showStock", value)}
        showComparePrice={settings.showComparePrice}
        onShowComparePriceChange={(value: boolean) => updateSetting("showComparePrice", value)}
        outOfStockBehavior={settings.outOfStockBehavior}
        onOutOfStockBehaviorChange={(value: OutOfStockBehavior) => updateSetting("outOfStockBehavior", value)}
        inheritStock={settings.inheritStock}
        onInheritStockChange={(value: boolean) => updateSetting("inheritStock", value)}
      />
    </ModalLayout>
  );
};

export default EditSettingsModal;
