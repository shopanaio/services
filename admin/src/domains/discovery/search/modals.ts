import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const SEARCH_PRODUCT_BOOST_MODAL_TYPE = "search-product-boost";
export const SEARCH_SYNONYM_GROUP_MODAL_TYPE = "search-synonym-group";

export type SearchConfigurationModalMode = "create" | "edit";

export interface IProductBoostModalPayload extends IModalStackPayload {
  mode: SearchConfigurationModalMode;
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface ISynonymGroupModalPayload extends IModalStackPayload {
  mode: SearchConfigurationModalMode;
  entityId?: string;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [SEARCH_PRODUCT_BOOST_MODAL_TYPE]: IProductBoostModalPayload;
    [SEARCH_SYNONYM_GROUP_MODAL_TYPE]: ISynonymGroupModalPayload;
  }
}

export const useProductBoostModal = createModalStackHook(SEARCH_PRODUCT_BOOST_MODAL_TYPE);
export const useSynonymGroupModal = createModalStackHook(SEARCH_SYNONYM_GROUP_MODAL_TYPE);
