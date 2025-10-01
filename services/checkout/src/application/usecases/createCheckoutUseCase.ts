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
} from "@shopana/plugin-sdk/shipping";
import { PaymentFlow } from "@shopana/plugin-sdk/payment";
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
    const { apiKey, project, customer, user, ...businessInput } = input;
    const context = { apiKey, project, customer, user };

    const id = uuidv7();
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
        }`
      );
    }
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
    try {
      const paymentMethods = await this.paymentApi.getPaymentMethods({
        projectId: context.project.id,
        currencyCode,
        apiKey: context.apiKey,
      });

      console.log(paymentMethods, "paymentMethods");

      // Deduplicate by provider+code pair
      const seen = new Set<string>();
      const unique = paymentMethods.filter((method: any) => {
        const key = `${method.provider}:${method.code}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return unique.map((method: any) => ({
        code: method.code,
        provider: method.provider,
        flow: method.flow,
        metadata: method.metadata ?? null,
        constraints: method.constraints ?? null,
      }));
    } catch (error) {
      this.logger.error({ error }, "Failed to get payment methods");

      // For payment API errors, return empty array instead of failing checkout creation
      this.logger.warn("Returning empty payment methods due to API error");
      return [];
    }
  }
}
