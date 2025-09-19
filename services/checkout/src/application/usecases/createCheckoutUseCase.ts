import {
  UseCase,
  type UseCaseDependencies,
} from "@src/application/usecases/useCase";
import type { CreateCheckoutInput } from "@src/application/checkout/types";
import type { CheckoutContext } from "@src/context/index.js";
import type { CreateCheckoutCommand } from "@src/domain/checkout/commands";
import type { CheckoutCreated } from "@src/domain/checkout/events";
import { v7 as uuidv7 } from "uuid";
import { checkoutDecider } from "@src/domain/checkout/decider";
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
    const streamId = this.streamNames.buildCheckoutStreamNameFromId(id);

    const command: CreateCheckoutCommand = {
      type: "checkout.create",
      data: {
        currencyCode: businessInput.currencyCode,
        idempotencyKey: businessInput.idempotencyKey,
        salesChannel: businessInput.salesChannel ?? "default",
        externalSource: businessInput.externalSource ?? businessInput.salesChannel ?? null,
        displayCurrencyCode: businessInput.displayCurrencyCode ?? null,
        displayExchangeRate: businessInput.displayExchangeRate ?? null,
        externalId: businessInput.externalId ?? null,
        localeCode: businessInput.localeCode ?? null,
        deliveryGroups: await this.createDeliveryGroups(context),
      },
      metadata: this.createCommandMetadata(id, context),
    };

    const { state } = await this.loadCheckoutState(id);

    const events = checkoutDecider.decide(command, state);
    const eventsToAppend = (
      Array.isArray(events) ? events : [events]
    ) as CheckoutCreated[];

    await this.appendToStream(
      streamId,
      eventsToAppend,
      "STREAM_DOES_NOT_EXIST",
    );

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
