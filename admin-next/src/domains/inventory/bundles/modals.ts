import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals";
import type {
  IBundleGroup,
  PricingRuleTemplate,
  IBundleSettings,
} from "@/domains/inventory/bundles/types";

export const BUNDLE_MODAL_TYPE = "bundle";
export const BUNDLE_EDIT_GROUPS_MODAL_TYPE = "bundle-edit-groups";
export const BUNDLE_EDIT_TEMPLATES_MODAL_TYPE = "bundle-edit-templates";
export const BUNDLE_EDIT_SETTINGS_MODAL_TYPE = "bundle-edit-settings";

export interface IBundleModalPayload extends IModalStackPayload {
  entityId: string;
}

export interface IBundleEditGroupsModalPayload extends IModalStackPayload {
  groups: IBundleGroup[];
  pricingTemplates: PricingRuleTemplate[];
  onSave?: (groups: IBundleGroup[]) => void;
}

export interface IBundleEditTemplatesModalPayload extends IModalStackPayload {
  pricingTemplates: PricingRuleTemplate[];
  onSave?: (data: { pricingTemplates: PricingRuleTemplate[] }) => void;
}

export interface IBundleEditSettingsModalPayload extends IModalStackPayload {
  settings: IBundleSettings;
  onSave?: (settings: IBundleSettings) => void;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [BUNDLE_MODAL_TYPE]: IBundleModalPayload;
    [BUNDLE_EDIT_GROUPS_MODAL_TYPE]: IBundleEditGroupsModalPayload;
    [BUNDLE_EDIT_TEMPLATES_MODAL_TYPE]: IBundleEditTemplatesModalPayload;
    [BUNDLE_EDIT_SETTINGS_MODAL_TYPE]: IBundleEditSettingsModalPayload;
  }
}

export const useBundleModal = createModalStackHook(BUNDLE_MODAL_TYPE);
export const useEditBundleGroupsModal = createModalStackHook(BUNDLE_EDIT_GROUPS_MODAL_TYPE);
export const useEditBundleTemplatesModal = createModalStackHook(BUNDLE_EDIT_TEMPLATES_MODAL_TYPE);
export const useEditBundleSettingsModal = createModalStackHook(BUNDLE_EDIT_SETTINGS_MODAL_TYPE);
