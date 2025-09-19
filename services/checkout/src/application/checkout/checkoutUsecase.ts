import type { EventStorePort } from "@src/application/ports/eventStorePort";
import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";
import type { Logger } from "pino";
import type { InventoryPort } from "@src/application/ports/inventoryPort";
import type { ShippingApiClient } from "@shopana/shipping-api";
import type { PricingApiClient } from "@shopana/pricing-api";
import { PromoServicePort } from "@src/application/ports/promoServicePort";
import { TaxServicePort } from "@src/application/ports/taxServicePort";
import type { WorkflowPort } from "@src/application/workflows/port";

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
  AddPromoCodeUseCase,
  RemovePromoCodeUseCase,
  UpdateDeliveryGroupMethodUseCase,
  AddDeliveryAddressUseCase,
  UpdateDeliveryAddressUseCase,
  RemoveDeliveryAddressUseCase,
  UpdateDeliveryGroupAddressUseCase,
} from "@src/application/usecases";
import { CheckoutService } from "@src/application/services/checkoutService";
import { CheckoutReadRepository } from "@src/application/read/checkoutReadRepository";

export class CheckoutUsecase {
  // Checkout use cases
  public readonly createCheckout: CreateCheckoutUseCase;
  public readonly getCheckoutById: GetCheckoutByIdUseCase;

  // Lines use cases
  public readonly addCheckoutLines: AddCheckoutLinesUseCase;
  public readonly updateCheckoutLines: UpdateCheckoutLinesUseCase;
  public readonly deleteCheckoutLines: DeleteCheckoutLinesUseCase;
  public readonly clearCheckoutLines: ClearCheckoutLinesUseCase;
  public readonly updateCustomerIdentity: UpdateCustomerIdentityUseCase;
  public readonly updateCustomerNote: UpdateCustomerNoteUseCase;
  public readonly updateLanguageCode: UpdateLanguageCodeUseCase;
  public readonly updateCurrencyCode: UpdateCurrencyCodeUseCase;
  public readonly addPromoCode: AddPromoCodeUseCase;
  public readonly removePromoCode: RemovePromoCodeUseCase;
  public readonly updateDeliveryGroupMethod: UpdateDeliveryGroupMethodUseCase;
  public readonly addDeliveryAddress: AddDeliveryAddressUseCase;
  public readonly updateDeliveryAddress: UpdateDeliveryAddressUseCase;
  public readonly removeDeliveryAddress: RemoveDeliveryAddressUseCase;
  public readonly updateDeliveryGroupAddress: UpdateDeliveryGroupAddressUseCase;

  constructor(deps: {
    workflows?: WorkflowPort;
    eventStore: EventStorePort;
    streamNames: StreamNamePolicyPort;
    logger?: Logger;
    inventory: InventoryPort;
    shippingApiClient: ShippingApiClient;
    pricingApiClient: PricingApiClient;
    promoService: PromoServicePort;
    taxService: TaxServicePort;
    checkoutService: CheckoutService;
    checkoutReadRepository: CheckoutReadRepository;
  }) {
    const baseDeps = {
      eventStore: deps.eventStore,
      streamNames: deps.streamNames,
      logger: deps.logger,
      inventory: deps.inventory,
      shippingApiClient: deps.shippingApiClient,
      pricingApiClient: deps.pricingApiClient,
      checkoutService: deps.checkoutService,
    };

    // Initialize checkout use cases
    this.createCheckout = new CreateCheckoutUseCase({
      ...baseDeps,
    });

    this.getCheckoutById = new GetCheckoutByIdUseCase({
      checkoutReadRepository: deps.checkoutReadRepository,
    }, baseDeps);

    // Initialize lines use cases
    this.addCheckoutLines = new AddCheckoutLinesUseCase({
      ...baseDeps,
    });

    this.updateCheckoutLines = new UpdateCheckoutLinesUseCase({
      ...baseDeps,
    });

    this.deleteCheckoutLines = new DeleteCheckoutLinesUseCase({
      ...baseDeps,
    });

    this.clearCheckoutLines = new ClearCheckoutLinesUseCase(baseDeps);

    // Initialize customer use cases
    this.updateCustomerIdentity = new UpdateCustomerIdentityUseCase(baseDeps);
    this.updateCustomerNote = new UpdateCustomerNoteUseCase(baseDeps);
    this.updateLanguageCode = new UpdateLanguageCodeUseCase(baseDeps);
    this.updateCurrencyCode = new UpdateCurrencyCodeUseCase(baseDeps);

    // Initialize promo use cases
    this.addPromoCode = new AddPromoCodeUseCase(baseDeps);

    this.removePromoCode = new RemovePromoCodeUseCase(baseDeps);

    // Initialize delivery use cases
    this.updateDeliveryGroupMethod = new UpdateDeliveryGroupMethodUseCase(
      baseDeps,
    );
    this.addDeliveryAddress = new AddDeliveryAddressUseCase(baseDeps);
    this.updateDeliveryAddress = new UpdateDeliveryAddressUseCase(baseDeps);
    this.removeDeliveryAddress = new RemoveDeliveryAddressUseCase(baseDeps);
    this.updateDeliveryGroupAddress = new UpdateDeliveryGroupAddressUseCase(
      baseDeps,
    );
  }
}
