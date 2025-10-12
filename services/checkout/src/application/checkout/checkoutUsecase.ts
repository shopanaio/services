import type { Logger } from "pino";
import type { ShippingApiClient, PaymentApiClient, PricingApiClient, InventoryApiClient } from "@shopana/shared-service-api";

// Import use cases
import {
  CreateCheckoutUseCase,
  GetCheckoutByIdUseCase,
  AddCheckoutLinesUseCase,
  UpdateCheckoutLinesUseCase,
  DeleteCheckoutLinesUseCase,
  ClearCheckoutLinesUseCase,
  UpdateCustomerIdentityUseCase,
  UpdateCustomerNoteUseCase,
  UpdateLanguageCodeUseCase,
  UpdateCurrencyCodeUseCase,
  UpdatePaymentMethodUseCase,
  AddPromoCodeUseCase,
  RemovePromoCodeUseCase,
  UpdateDeliveryGroupMethodUseCase,
  AddDeliveryAddressUseCase,
  UpdateDeliveryAddressUseCase,
  RemoveDeliveryAddressUseCase,
  UpdateDeliveryGroupAddressUseCase,
} from "@src/application/usecases";
import { ReplaceCheckoutLinesUseCase } from "@src/application/usecases/replaceCheckoutLinesUseCase";
import { UpdateDeliveryGroupRecipientUseCase } from "@src/application/usecases/updateDeliveryGroupRecipientUseCase";
import { RemoveDeliveryGroupRecipientUseCase } from "@src/application/usecases/removeDeliveryGroupRecipientUseCase";
import { CheckoutService } from "@src/application/services/checkoutService";
import { CheckoutReadRepository } from "@src/application/read/checkoutReadRepository";
import { GetCheckoutDtoByIdUseCase } from "@src/application/usecases/getCheckoutDtoByIdUseCase";
import { CheckoutWriteRepository } from "@src/infrastructure/writeModel/checkoutWriteRepository";

export class CheckoutUsecase {
  // Checkout use cases
  public readonly createCheckout: CreateCheckoutUseCase;
  public readonly getCheckoutById: GetCheckoutByIdUseCase;
  public readonly getCheckoutDtoById: GetCheckoutDtoByIdUseCase;

  // Lines use cases
  public readonly addCheckoutLines: AddCheckoutLinesUseCase;
  public readonly updateCheckoutLines: UpdateCheckoutLinesUseCase;
  public readonly deleteCheckoutLines: DeleteCheckoutLinesUseCase;
  public readonly clearCheckoutLines: ClearCheckoutLinesUseCase;
  public readonly updateCustomerIdentity: UpdateCustomerIdentityUseCase;
  public readonly updateCustomerNote: UpdateCustomerNoteUseCase;
  public readonly updateLanguageCode: UpdateLanguageCodeUseCase;
  public readonly updateCurrencyCode: UpdateCurrencyCodeUseCase;
  public readonly updatePaymentMethod: UpdatePaymentMethodUseCase;
  public readonly addPromoCode: AddPromoCodeUseCase;
  public readonly removePromoCode: RemovePromoCodeUseCase;
  public readonly updateDeliveryGroupMethod: UpdateDeliveryGroupMethodUseCase;
  public readonly addDeliveryAddress: AddDeliveryAddressUseCase;
  public readonly updateDeliveryAddress: UpdateDeliveryAddressUseCase;
  public readonly removeDeliveryAddress: RemoveDeliveryAddressUseCase;
  public readonly updateDeliveryGroupAddress: UpdateDeliveryGroupAddressUseCase;
  public readonly updateDeliveryGroupRecipient: UpdateDeliveryGroupRecipientUseCase;
  public readonly removeDeliveryGroupRecipient: RemoveDeliveryGroupRecipientUseCase;
  public readonly replaceCheckoutLines: ReplaceCheckoutLinesUseCase;

  constructor(deps: {
    logger?: Logger;
    inventory: InventoryApiClient;
    shippingApiClient: ShippingApiClient;
    paymentApiClient: PaymentApiClient;
    pricingApiClient: PricingApiClient;
    checkoutService: CheckoutService;
    checkoutReadRepository: CheckoutReadRepository;
    checkoutWriteRepository: CheckoutWriteRepository;
  }) {
    const baseDeps = {
      logger: deps.logger,
      inventory: deps.inventory,
      shippingApiClient: deps.shippingApiClient,
      paymentApiClient: deps.paymentApiClient,
      pricingApiClient: deps.pricingApiClient,
      checkoutService: deps.checkoutService,
      checkoutReadRepository: deps.checkoutReadRepository,
      checkoutWriteRepository: deps.checkoutWriteRepository,
    };

    // Initialize checkout use cases
    this.createCheckout = new CreateCheckoutUseCase({
      ...baseDeps,
    });

    this.getCheckoutById = new GetCheckoutByIdUseCase(
      {
        checkoutReadRepository: deps.checkoutReadRepository,
      },
      baseDeps
    );

    // Serialized DTO from event store aggregate
    this.getCheckoutDtoById = new GetCheckoutDtoByIdUseCase(baseDeps);

    // Initialize lines use cases
    this.addCheckoutLines = new AddCheckoutLinesUseCase(baseDeps);
    this.updateCheckoutLines = new UpdateCheckoutLinesUseCase(baseDeps);
    this.deleteCheckoutLines = new DeleteCheckoutLinesUseCase(baseDeps);
    this.clearCheckoutLines = new ClearCheckoutLinesUseCase(baseDeps);
    this.replaceCheckoutLines = new ReplaceCheckoutLinesUseCase(baseDeps);

    // Initialize customer use cases
    this.updateCustomerIdentity = new UpdateCustomerIdentityUseCase(baseDeps);
    this.updateCustomerNote = new UpdateCustomerNoteUseCase(baseDeps);
    this.updateLanguageCode = new UpdateLanguageCodeUseCase(baseDeps);
    this.updateCurrencyCode = new UpdateCurrencyCodeUseCase(baseDeps);
    this.updatePaymentMethod = new UpdatePaymentMethodUseCase(baseDeps);

    // Initialize promo use cases
    this.addPromoCode = new AddPromoCodeUseCase(baseDeps);
    this.removePromoCode = new RemovePromoCodeUseCase(baseDeps);

    // Initialize delivery use cases
    this.updateDeliveryGroupMethod = new UpdateDeliveryGroupMethodUseCase(
      baseDeps
    );
    this.addDeliveryAddress = new AddDeliveryAddressUseCase(baseDeps);
    this.updateDeliveryAddress = new UpdateDeliveryAddressUseCase(baseDeps);
    this.removeDeliveryAddress = new RemoveDeliveryAddressUseCase(baseDeps);
    this.updateDeliveryGroupAddress = new UpdateDeliveryGroupAddressUseCase(
      baseDeps
    );
    this.updateDeliveryGroupRecipient = new UpdateDeliveryGroupRecipientUseCase(
      baseDeps
    );
    this.removeDeliveryGroupRecipient = new RemoveDeliveryGroupRecipientUseCase(
      baseDeps
    );
  }
}
