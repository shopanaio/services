import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals";
import type {
  IComponentGroup,
  PricingRuleTemplate,
  IDependencyRule,
  IBundleSettings,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

export const BUNDLE_MODAL_TYPE = "bundle";
export const BUNDLE_EDIT_GROUPS_MODAL_TYPE = "bundle-edit-groups";
export const BUNDLE_EDIT_PRICING_MODAL_TYPE = "bundle-edit-pricing";
export const BUNDLE_EDIT_SETTINGS_MODAL_TYPE = "bundle-edit-settings";

export interface IBundleModalPayload extends IModalStackPayload {
  entityId: string;
}

export interface IBundleEditGroupsModalPayload extends IModalStackPayload {
  groups: IComponentGroup[];
  pricingTemplates: PricingRuleTemplate[];
  onSave?: (groups: IComponentGroup[]) => void;
}

export interface IBundleEditPricingModalPayload extends IModalStackPayload {
  pricingTemplates: PricingRuleTemplate[];
  dependencyRules: IDependencyRule[];
  groups: IComponentGroup[];
  onSave?: (data: {
    pricingTemplates: PricingRuleTemplate[];
    dependencyRules: IDependencyRule[];
  }) => void;
}

export interface IBundleEditSettingsModalPayload extends IModalStackPayload {
  settings: IBundleSettings;
  onSave?: (settings: IBundleSettings) => void;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [BUNDLE_MODAL_TYPE]: IBundleModalPayload;
    [BUNDLE_EDIT_GROUPS_MODAL_TYPE]: IBundleEditGroupsModalPayload;
    [BUNDLE_EDIT_PRICING_MODAL_TYPE]: IBundleEditPricingModalPayload;
    [BUNDLE_EDIT_SETTINGS_MODAL_TYPE]: IBundleEditSettingsModalPayload;
  }
}

export const useBundleModal = createModalStackHook(BUNDLE_MODAL_TYPE);
export const useEditBundleGroupsModal = createModalStackHook(BUNDLE_EDIT_GROUPS_MODAL_TYPE);
export const useEditBundlePricingModal = createModalStackHook(BUNDLE_EDIT_PRICING_MODAL_TYPE);
export const useEditBundleSettingsModal = createModalStackHook(BUNDLE_EDIT_SETTINGS_MODAL_TYPE);
