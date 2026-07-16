import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
export const CUSTOMER_TAG_MODAL_TYPE = "customer-tag";
export interface CustomerTagModalPayload extends IModalStackPayload { mode: "create" | "edit"; entityId?: string; onSaved?: () => Promise<unknown> | unknown; }
declare module "@/layouts/modals" { interface ModalStackPayloads { [CUSTOMER_TAG_MODAL_TYPE]: CustomerTagModalPayload; } }
export const useCustomerTagModal = createModalStackHook(CUSTOMER_TAG_MODAL_TYPE);
