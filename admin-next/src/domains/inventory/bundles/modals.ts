import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals";

export const BUNDLE_MODAL_TYPE = "bundle";

export interface IBundleModalPayload extends IModalStackPayload {
  entityId: string;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [BUNDLE_MODAL_TYPE]: IBundleModalPayload;
  }
}

export const useBundleModal = createModalStackHook(BUNDLE_MODAL_TYPE);
