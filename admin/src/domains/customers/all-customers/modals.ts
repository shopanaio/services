import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const CUSTOMER_MODAL_TYPE = "customer";
export const CUSTOMER_CREATE_MODAL_TYPE = "customer-create";
export const CUSTOMER_EDIT_MODAL_TYPE = "customer-edit";

export interface CustomerModalPayload extends IModalStackPayload {
  entityId: string;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface CustomerCreateModalPayload extends IModalStackPayload {
  onCreated?: (customerId: string) => Promise<unknown> | unknown;
}

export type CustomerEditSection =
  | "profile"
  | "company"
  | "status"
  | "notes"
  | "classification"
  | "addresses"
  | "consents"
  | "tax";

export interface CustomerEditModalPayload extends IModalStackPayload {
  entityId: string;
  section: CustomerEditSection;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [CUSTOMER_MODAL_TYPE]: CustomerModalPayload;
    [CUSTOMER_CREATE_MODAL_TYPE]: CustomerCreateModalPayload;
    [CUSTOMER_EDIT_MODAL_TYPE]: CustomerEditModalPayload;
  }
}

export const useCustomerModal = createModalStackHook(CUSTOMER_MODAL_TYPE);
export const useCustomerCreateModal = createModalStackHook(CUSTOMER_CREATE_MODAL_TYPE);
export const useCustomerEditModal = createModalStackHook(CUSTOMER_EDIT_MODAL_TYPE);
