import { createModalStackHook } from "@/layouts/modals"; import type { IModalStackPayload } from "@/layouts/modals/types";
export const CUSTOMER_DATA_REQUEST_MODAL_TYPE = "customer-data-request"; export const CUSTOMER_MERGE_MODAL_TYPE = "customer-merge";
export interface CustomerDataRequestModalPayload extends IModalStackPayload { mode: "create" | "edit"; entityId?: string; customerId?: string; onSaved?: () => Promise<unknown> | unknown; }
export interface CustomerMergeModalPayload extends IModalStackPayload { mode: "create" | "edit"; entityId?: string; sourceCustomerId?: string; onSaved?: () => Promise<unknown> | unknown; }
declare module "@/layouts/modals" { interface ModalStackPayloads { [CUSTOMER_DATA_REQUEST_MODAL_TYPE]: CustomerDataRequestModalPayload; [CUSTOMER_MERGE_MODAL_TYPE]: CustomerMergeModalPayload; } }
export const useCustomerDataRequestModal = createModalStackHook(CUSTOMER_DATA_REQUEST_MODAL_TYPE); export const useCustomerMergeModal = createModalStackHook(CUSTOMER_MERGE_MODAL_TYPE);
