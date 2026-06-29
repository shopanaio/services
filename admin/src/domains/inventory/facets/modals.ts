import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { FacetType, FacetUiType } from "@/graphql/types";

export const FACET_CREATE_MODAL_TYPE = "facet-create";
export const FACET_EDIT_MODAL_TYPE = "facet-edit";
export const FACET_VALUE_CREATE_MODAL_TYPE = "facet-value-create";
export const FACET_VALUE_LINK_SOURCES_MODAL_TYPE = "facet-value-link-sources";
export const FACET_VALUES_MERGE_MODAL_TYPE = "facet-values-merge";
export const FACET_SWATCH_EDIT_MODAL_TYPE = "facet-swatch-edit";

export interface ICreateFacetModalPayload extends IModalStackPayload {
  nextSortIndex?: number;
  initialValues?: Partial<{
    label: string;
    slug: string;
    facetType: FacetType;
    uiType: FacetUiType;
  }>;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface IEditFacetModalPayload extends IModalStackPayload {
  facetId: string;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface ICreateFacetValueModalPayload extends IModalStackPayload {
  facetId: string;
  facetLabel: string;
  facetType: FacetType;
  nextSortIndex?: number;
  initialValues?: Partial<{
    label: string;
    slug: string;
    enabled: boolean;
    sourceHandles: string[];
    swatchId: string | null;
  }>;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface ILinkSourceValuesModalPayload extends IModalStackPayload {
  valueId: string;
  valueLabel: string;
  sourceHandles: string[];
  onSave?: (sourceHandles: string[]) => Promise<boolean | void> | boolean | void;
}

export interface IFacetValuesMergeModalPayload extends IModalStackPayload {
  selectedRowIds: string[];
}

export interface IFacetSwatchEditModalPayload extends IModalStackPayload {
  valueId: string;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [FACET_CREATE_MODAL_TYPE]: ICreateFacetModalPayload;
    [FACET_EDIT_MODAL_TYPE]: IEditFacetModalPayload;
    [FACET_VALUE_CREATE_MODAL_TYPE]: ICreateFacetValueModalPayload;
    [FACET_VALUE_LINK_SOURCES_MODAL_TYPE]: ILinkSourceValuesModalPayload;
    [FACET_VALUES_MERGE_MODAL_TYPE]: IFacetValuesMergeModalPayload;
    [FACET_SWATCH_EDIT_MODAL_TYPE]: IFacetSwatchEditModalPayload;
  }
}

export const useCreateFacetModal =
  createModalStackHook(FACET_CREATE_MODAL_TYPE);
export const useEditFacetModal = createModalStackHook(FACET_EDIT_MODAL_TYPE);
export const useCreateFacetValueModal = createModalStackHook(
  FACET_VALUE_CREATE_MODAL_TYPE,
);
export const useLinkSourceValuesModal = createModalStackHook(
  FACET_VALUE_LINK_SOURCES_MODAL_TYPE,
);
