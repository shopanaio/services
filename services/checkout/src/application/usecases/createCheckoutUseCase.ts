import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateCheckoutInput } from "@src/application/checkout/types";
import type { CheckoutContext } from "@src/context/index.js";
import type { CheckoutCreatedDto } from "@src/domain/checkout/dto";
import { v7 as uuidv7 } from "uuid";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shared-service-api";
import { PaymentFlow } from "@shopana/shared-service-api";
// Payment types will be resolved at runtime through the API

export interface CreateCheckoutUseCaseDependencies
  extends UseCaseDependencies {}

export class CreateCheckoutUseCase extends UseCase<
  CreateCheckoutInput,
  string
> {
  constructor(deps: CreateCheckoutUseCaseDependencies) {
    super(deps);
  }

  async execute(input: CreateCheckoutInput): Promise<string> {
    const { apiKey, store, customer, user, ...businessInput } = input;
    const context = { apiKey, store, customer, user };

    const id = uuidv7();
    const tags = (businessInput.tags ?? []).map((tag) => ({
      id: uuidv7(),
      slug: tag.slug,
      isUnique: tag.isUnique,
    }));

    const dto: CheckoutCreatedDto = {
      data: {
        currencyCode: businessInput.currencyCode,
        idempotencyKey: businessInput.idempotencyKey,
        salesChannel: businessInput.salesChannel ?? "default",
        externalSource:
          businessInput.externalSource ?? businessInput.salesChannel ?? null,
        externalId: businessInput.externalId ?? null,
        localeCode: businessInput.localeCode ?? null,
        deliveryGroups: await this.createDeliveryGroups(context),
        paymentMethods: await this.createPaymentMethods(
          context,
          id,
          businessInput.currencyCode
        ),
        tags,
      },
      metadata: this.createMetadataDto(id, context),
    };

    await this.checkoutWriteRepository.createCheckout(dto);

    return id;
  }

  /**
   * Build delivery groups for an array of line items. The resulting groups reference
   * items by their index within the provided array.
   */
  protected async createDeliveryGroups(context: CheckoutContext): Promise<
    Array<{
      id: string;
      deliveryMethods: Array<{
        code: string;
        provider: string;
        deliveryMethodType: DeliveryMethodType;
        shippingPaymentModel: ShippingPaymentModel;
      }>;
    }>
  > {
    void context;
    // TODO(checkout-rewrite): calculate delivery groups from the new
    // delivery.calculateOptions action after merchandise lines are known.
    const deliveryGroups: any[] = [];
    return deliveryGroups;
  }

  /**
   * Get available payment methods for checkout.
   */
  protected async createPaymentMethods(
    context: CheckoutContext,
    checkoutId: string,
    currencyCode: string
  ): Promise<
    Array<{
      code: string;
      provider: string;
      flow: PaymentFlow;
      metadata: Record<string, unknown> | null;
      constraints: Record<string, unknown> | null;
    }>
  > {
    void context;
    void checkoutId;
    void currencyCode;
    // TODO(checkout-rewrite): populate this from the new
    // payments.getAvailableMethods action and payment customization pipeline.
    const paymentMethods: any[] = [];
    return paymentMethods;
  }
}
