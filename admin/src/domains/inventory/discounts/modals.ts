import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type { ApiDiscount } from "@/graphql/types";

export const DISCOUNT_CREATE_MODAL_TYPE = "discount-create";
export const DISCOUNT_MODAL_TYPE = "discount";
export const DISCOUNT_GENERAL_EDIT_MODAL_TYPE = "discount-general-edit";
export const DISCOUNT_VALUE_TARGETS_EDIT_MODAL_TYPE = "discount-value-targets-edit";
export const DISCOUNT_ELIGIBILITY_CHANNELS_EDIT_MODAL_TYPE = "discount-eligibility-channels-edit";
export const DISCOUNT_AVAILABILITY_EDIT_MODAL_TYPE = "discount-availability-edit";

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

export interface IDiscountValueTargetsEditModalPayload extends IModalStackPayload {
  discount: ApiDiscount;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface IDiscountEligibilityChannelsEditModalPayload extends IModalStackPayload {
  discount: ApiDiscount;
  onSaved?: () => Promise<unknown> | unknown;
}

export interface IDiscountAvailabilityEditModalPayload extends IModalStackPayload {
  discount: ApiDiscount;
  onSaved?: () => Promise<unknown> | unknown;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [DISCOUNT_MODAL_TYPE]: IDiscountModalPayload;
    [DISCOUNT_CREATE_MODAL_TYPE]: ICreateDiscountModalPayload;
    [DISCOUNT_GENERAL_EDIT_MODAL_TYPE]: IDiscountGeneralEditModalPayload;
    [DISCOUNT_VALUE_TARGETS_EDIT_MODAL_TYPE]: IDiscountValueTargetsEditModalPayload;
    [DISCOUNT_ELIGIBILITY_CHANNELS_EDIT_MODAL_TYPE]: IDiscountEligibilityChannelsEditModalPayload;
    [DISCOUNT_AVAILABILITY_EDIT_MODAL_TYPE]: IDiscountAvailabilityEditModalPayload;
  }
}

export const useDiscountModal = createModalStackHook(DISCOUNT_MODAL_TYPE);

export const useCreateDiscountModal = createModalStackHook(DISCOUNT_CREATE_MODAL_TYPE);

export const useDiscountGeneralEditModal = createModalStackHook(DISCOUNT_GENERAL_EDIT_MODAL_TYPE);

export const useDiscountValueTargetsEditModal = createModalStackHook(
  DISCOUNT_VALUE_TARGETS_EDIT_MODAL_TYPE,
);

export const useDiscountEligibilityChannelsEditModal = createModalStackHook(
  DISCOUNT_ELIGIBILITY_CHANNELS_EDIT_MODAL_TYPE,
);

export const useDiscountAvailabilityEditModal = createModalStackHook(
  DISCOUNT_AVAILABILITY_EDIT_MODAL_TYPE,
);
