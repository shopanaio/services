import type { ServiceBroker } from "moleculer";
import type {
  PricingApiClient,
  GetAllDiscountsResponse,
  ValidateDiscountResponse,
  PricingEvaluateDiscountsInput,
  PricingEvaluateDiscountsResult,
} from "./types";
import type { Discount } from "@shopana/pricing-plugin-sdk";

export class PricingClient implements PricingApiClient {
  private readonly broker: ServiceBroker;

  constructor(broker: ServiceBroker) {
    this.broker = broker;
  }

  /** @inheritdoc */
  async getProjectDiscounts(): Promise<Discount[]> {
    const data = await this.broker.call<GetAllDiscountsResponse>(
      "pricing.getProjectDiscounts"
    );
    return data.discounts ?? [];
  }

  /** @inheritdoc */
  async validateDiscount(input: {
    code: string;
    provider?: string;
  }): Promise<ValidateDiscountResponse> {
    return await this.broker.call<ValidateDiscountResponse, {}>(
      "pricing.validateDiscount",
      input
    );
  }

  /** @inheritdoc */
  async evaluateDiscounts(
    input: PricingEvaluateDiscountsInput
  ): Promise<PricingEvaluateDiscountsResult> {
    try {
      return (await this.broker.call<PricingEvaluateDiscountsResult, {}>(
        "pricing.evaluateDiscounts",
        input
      )) as PricingEvaluateDiscountsResult;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
