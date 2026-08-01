import type { BrokerLike } from "../broker";
import type {
  PricingApiClient,
  ValidateDiscountResponse,
  PricingEvaluateDiscountsInput,
  PricingEvaluateDiscountsResult,
} from "./types";

export class PricingClient implements PricingApiClient {
  private readonly broker: BrokerLike;

  constructor(broker: BrokerLike) {
    this.broker = broker;
  }

  /** @inheritdoc */
  async validateDiscount(input: {
    code: string;
    provider?: string;
  }): Promise<ValidateDiscountResponse> {
    return (await this.broker.call(
      "pricing.validateDiscount",
      input
    )) as ValidateDiscountResponse;
  }

  /** @inheritdoc */
  async evaluateDiscounts(
    input: PricingEvaluateDiscountsInput
  ): Promise<PricingEvaluateDiscountsResult> {
    try {
      return (await this.broker.call(
        "pricing.evaluateDiscounts",
        input
      )) as PricingEvaluateDiscountsResult;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
