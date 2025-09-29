import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateCheckoutInput } from "@src/application/checkout/types";
import type { CheckoutContext } from "@src/context/index.js";
import type { CheckoutCreatedDto } from "@src/domain/checkout/events";
import { v7 as uuidv7 } from "uuid";
import {
  DeliveryMethodType,
  ShippingPaymentModel,
} from "@shopana/shipping-plugin-sdk";

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
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const id = uuidv7();
    const event: CheckoutCreatedDto = {
      type: "checkout.created",
      data: {
        currencyCode: businessInput.currencyCode,
        idempotencyKey: businessInput.idempotencyKey,
        salesChannel: businessInput.salesChannel ?? "default",
        externalSource:
          businessInput.externalSource ?? businessInput.salesChannel ?? null,
        externalId: businessInput.externalId ?? null,
        localeCode: businessInput.localeCode ?? null,
        deliveryGroups: await this.createDeliveryGroups(context),
      },
      metadata: this.createMetadataDto(id, context),
    };

    await this.checkoutWriteRepository.createCheckout(event);

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
    try {
      const deliveryGroups = await this.shippingApi.createDeliveryGroups({
        projectId: context.project.id,
        items: [],
      });

      return deliveryGroups.map((g, index) => ({
        id: uuidv7(), // Generate unique ID for each delivery group
        deliveryMethods: g.methods.map((method) => ({
          code: method.code,
          provider: method.provider,
          deliveryMethodType: method.deliveryMethodType,
          shippingPaymentModel: method.shippingPaymentModel,
        })),
      }));
    } catch (error) {
      this.logger.error({ error }, "Failed to create delivery groups");

      // For shipping API errors, create a clear message
      throw new Error(
        `Failed to create delivery groups: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }
}
