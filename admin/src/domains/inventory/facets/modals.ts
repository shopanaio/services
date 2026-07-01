import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { FacetType, FacetUiType } from "@/graphql/types";
import type { FacetValueEditorRow } from "./modals/edit-facet-modal/types";

export const FACET_CREATE_MODAL_TYPE = "facet-create";
export const FACET_EDIT_MODAL_TYPE = "facet-edit";
export const FACET_VALUE_LINK_SOURCES_MODAL_TYPE = "facet-value-link-sources";
export const FACET_VALUES_MERGE_MODAL_TYPE = "facet-values-merge";
export const FACET_VALUE_GROUP_MODAL_TYPE = "facet-value-group";
export const FACET_VALUE_CANDIDATES_MODAL_TYPE = "facet-value-candidates";
export const FACET_SWATCH_EDIT_MODAL_TYPE = "facet-swatch-edit";

export interface ICreateFacetModalPayload extends IModalStackPayload {
  nextSortIndex?: number;
  initialValues?: Partial<{
    label: string;
    slug: string;
    facetType: FacetType;
    uiType: FacetUiType;
    sources: Array<{
      handle: string;
      name: string;
    }>;
    source: {
      handle: string;
      name: string;
    } | null;
  }>;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface IEditFacetModalPayload extends IModalStackPayload {
  facetId: string;
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

export interface IFacetValueGroupModalPayload extends IModalStackPayload {
  groupMode: "create" | "edit" | "add-to-existing";
  facetId: string;
  selectedValues: FacetValueEditorRow[];
  availableValues: FacetValueEditorRow[];
  groupValueId?: string;
  initialGroupLabel?: string;
  initialGroupedValues?: FacetValueEditorRow[];
  onSaved?: () => Promise<unknown> | unknown;
}

export interface IFacetValueCandidatesModalPayload extends IModalStackPayload {
  facetId: string;
  facetType: FacetType;
  sourceHandles?: string[];
  nextSortIndex?: number;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface IFacetSwatchEditModalPayload extends IModalStackPayload {
  valueId: string;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [FACET_CREATE_MODAL_TYPE]: ICreateFacetModalPayload;
    [FACET_EDIT_MODAL_TYPE]: IEditFacetModalPayload;
    [FACET_VALUE_LINK_SOURCES_MODAL_TYPE]: ILinkSourceValuesModalPayload;
    [FACET_VALUES_MERGE_MODAL_TYPE]: IFacetValuesMergeModalPayload;
    [FACET_VALUE_GROUP_MODAL_TYPE]: IFacetValueGroupModalPayload;
    [FACET_VALUE_CANDIDATES_MODAL_TYPE]: IFacetValueCandidatesModalPayload;
    [FACET_SWATCH_EDIT_MODAL_TYPE]: IFacetSwatchEditModalPayload;
  }
}

export const useCreateFacetModal =
  createModalStackHook(FACET_CREATE_MODAL_TYPE);
export const useEditFacetModal = createModalStackHook(FACET_EDIT_MODAL_TYPE);
export const useLinkSourceValuesModal = createModalStackHook(
  FACET_VALUE_LINK_SOURCES_MODAL_TYPE,
);
export const useFacetValueGroupModal = createModalStackHook(
  FACET_VALUE_GROUP_MODAL_TYPE,
);
export const useFacetValueCandidatesModal = createModalStackHook(
  FACET_VALUE_CANDIDATES_MODAL_TYPE,
);
