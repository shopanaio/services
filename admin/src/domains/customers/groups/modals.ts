import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";

export const CUSTOMER_GROUP_MODAL_TYPE = "customer-group";
export interface CustomerGroupModalPayload extends IModalStackPayload { mode: "create" | "edit"; entityId?: string; onSaved?: () => Promise<unknown> | unknown; }
declare module "@/layouts/modals" { interface ModalStackPayloads { [CUSTOMER_GROUP_MODAL_TYPE]: CustomerGroupModalPayload; } }
export const useCustomerGroupModal = createModalStackHook(CUSTOMER_GROUP_MODAL_TYPE);
