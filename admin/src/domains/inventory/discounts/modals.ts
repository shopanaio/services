import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiDiscount } from "@/graphql/types";

export const DISCOUNT_CREATE_MODAL_TYPE = "discount-create";
export const DISCOUNT_MODAL_TYPE = "discount";
export const DISCOUNT_GENERAL_EDIT_MODAL_TYPE = "discount-general-edit";

export interface IDiscountModalPayload extends IModalStackPayload {
  entityId: string;
}

export interface ICreateDiscountModalPayload extends IModalStackPayload {
  onCreated?: (discount: ApiDiscount) => Promise<unknown> | unknown;
}

export interface IDiscountGeneralEditModalPayload extends IModalStackPayload {
  discount: ApiDiscount;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [DISCOUNT_MODAL_TYPE]: IDiscountModalPayload;
    [DISCOUNT_CREATE_MODAL_TYPE]: ICreateDiscountModalPayload;
    [DISCOUNT_GENERAL_EDIT_MODAL_TYPE]: IDiscountGeneralEditModalPayload;
  }
}

export const useDiscountModal = createModalStackHook(DISCOUNT_MODAL_TYPE);

export const useCreateDiscountModal = createModalStackHook(
  DISCOUNT_CREATE_MODAL_TYPE,
);

export const useDiscountGeneralEditModal = createModalStackHook(
  DISCOUNT_GENERAL_EDIT_MODAL_TYPE,
);
