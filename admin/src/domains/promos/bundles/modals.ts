import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type {
  IBundleGroup,
  IDependencyRule,
  PricingRuleTemplate,
  IBundleSettings,
} from "@/domains/promos/bundles/types";

export const BUNDLE_MODAL_TYPE = "bundle";
export const BUNDLE_EDIT_GROUPS_MODAL_TYPE = "bundle-edit-groups";
export const BUNDLE_EDIT_TEMPLATES_MODAL_TYPE = "bundle-edit-templates";
export const BUNDLE_EDIT_SETTINGS_MODAL_TYPE = "bundle-edit-settings";
export const BUNDLE_ITEM_VARIANT_SETTINGS_MODAL_TYPE = "bundle-item-variant-settings";
export const DEPENDENCY_CHART_MODAL_TYPE = "dependency-chart";

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

export interface IDependencyChartModalPayload extends IModalStackPayload {
  groups: IBundleGroup[];
  rules: IDependencyRule[];
  selectedRuleId?: string;
  onSave?: (rules: IDependencyRule[]) => void;
}

export interface IBundleItemVariantSettingsModalPayload extends IModalStackPayload {
  itemId: string;
  productId: string;
  productTitle: string;
  availableVariantIds: string[] | null;
  priceType: "BASE" | "FIXED" | "DISCOUNT_PERCENT" | "DISCOUNT_FIXED" | "FREE";
  priceValue: number | null;
  variants: Array<{
    id: string;
    title: string;
    sku: string;
    price: number;
    stock: number;
    options?: Array<{
      optionId: string;
      optionName: string;
      value: string;
    }>;
  }>;
  options?: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  showAsVariants?: boolean;
  onSave?: (data: {
    availableVariantIds: string[] | null;
    showAsVariants: boolean;
  }) => void;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [BUNDLE_MODAL_TYPE]: IBundleModalPayload;
    [BUNDLE_EDIT_GROUPS_MODAL_TYPE]: IBundleEditGroupsModalPayload;
    [BUNDLE_EDIT_TEMPLATES_MODAL_TYPE]: IBundleEditTemplatesModalPayload;
    [BUNDLE_EDIT_SETTINGS_MODAL_TYPE]: IBundleEditSettingsModalPayload;
    [BUNDLE_ITEM_VARIANT_SETTINGS_MODAL_TYPE]: IBundleItemVariantSettingsModalPayload;
    [DEPENDENCY_CHART_MODAL_TYPE]: IDependencyChartModalPayload;
  }
}

export const useBundleModal = createModalStackHook(BUNDLE_MODAL_TYPE);
export const useEditBundleGroupsModal = createModalStackHook(BUNDLE_EDIT_GROUPS_MODAL_TYPE);
export const useEditBundleTemplatesModal = createModalStackHook(BUNDLE_EDIT_TEMPLATES_MODAL_TYPE);
export const useEditBundleSettingsModal = createModalStackHook(BUNDLE_EDIT_SETTINGS_MODAL_TYPE);
export const useBundleItemVariantSettingsModal = createModalStackHook(BUNDLE_ITEM_VARIANT_SETTINGS_MODAL_TYPE);
export const useDependencyChartModal = createModalStackHook(DEPENDENCY_CHART_MODAL_TYPE);
