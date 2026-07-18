import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiDiscount } from "@/graphql/types";

export const DISCOUNT_CREATE_MODAL_TYPE = "discount-create";

export interface ICreateDiscountModalPayload extends IModalStackPayload {
  onCreated?: (discount: ApiDiscount) => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [DISCOUNT_CREATE_MODAL_TYPE]: ICreateDiscountModalPayload;
  }
}

export const useCreateDiscountModal = createModalStackHook(
  DISCOUNT_CREATE_MODAL_TYPE,
);
