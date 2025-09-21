// UseCases module: re-exports application use-cases

// Base UseCase
export { UseCase } from "./useCase";
export type { UseCaseDependencies } from "./useCase";

// Checkout Usecase (collection of all use cases)
export { CheckoutUsecase } from "../checkout/checkoutUsecase";

// Checkout use cases
export { CreateCheckoutUseCase } from "./createCheckoutUseCase";
export { GetCheckoutByIdUseCase } from "./getCheckoutByIdUseCase";
export { GetCheckoutDtoByIdUseCase } from "./getCheckoutDtoByIdUseCase";

// Lines management use cases
export { AddCheckoutLinesUseCase } from "./addCheckoutLinesUseCase";
export { UpdateCheckoutLinesUseCase } from "./updateCheckoutLinesUseCase";
export { DeleteCheckoutLinesUseCase } from "./removeCheckoutLinesUseCase";
export { ClearCheckoutLinesUseCase } from "./clearCheckoutLinesUseCase";

// Customer use cases
export { UpdateCustomerIdentityUseCase } from "./updateCustomerIdentityUseCase";
export { UpdateCustomerNoteUseCase } from "./updateCustomerNoteUseCase";
export { UpdateLanguageCodeUseCase } from "./updateLanguageCodeUseCase";
export { UpdateCurrencyCodeUseCase } from "./updateCurrencyCodeUseCase";

// Promo code use cases
export { AddPromoCodeUseCase } from "./addPromoCodeUseCase";
export { RemovePromoCodeUseCase } from "./removePromoCodeUseCase";

// Delivery use cases
export { UpdateDeliveryGroupMethodUseCase } from "./updateDeliveryGroupMethodUseCase";
export { AddDeliveryAddressUseCase } from "./addDeliveryAddressUseCase";
export { UpdateDeliveryAddressUseCase } from "./updateDeliveryAddressUseCase";
export { RemoveDeliveryAddressUseCase } from "./removeDeliveryAddressUseCase";
export { UpdateDeliveryGroupAddressUseCase } from "./updateDeliveryGroupAddressUseCase";

// Types from checkout module
export type {
  CreateCheckoutInput,
  CheckoutLinesAddInput,
  CheckoutLinesUpdateInput,
  CheckoutLinesDeleteInput,
  CheckoutLinesClearInput,
  CheckoutCustomerIdentityUpdateInput,
  CheckoutCustomerNoteUpdateInput,
  CheckoutLanguageCodeUpdateInput,
  CheckoutCurrencyCodeUpdateInput,
  CheckoutDeliveryMethodUpdateInput,
  CheckoutDeliveryAddressAddInput,
  CheckoutDeliveryAddressUpdateInput,
  CheckoutDeliveryAddressRemoveInput,
  CheckoutDeliveryGroupAddressUpdateInput,
  CheckoutPromoCodeAddInput,
  CheckoutPromoCodeRemoveInput,
} from "@src/application/checkout/types";

// DTOs
export { CreateCheckoutDto } from "@src/application/dto/createCheckout.dto";
