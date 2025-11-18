import type { BrokerLike } from "../broker";
import type {
  PricingApiClient,
  GetAllDiscountsResponse,
  ValidateDiscountResponse,
  PricingEvaluateDiscountsInput,
  PricingEvaluateDiscountsResult,
} from "./types";
import type { Discount } from "@shopana/plugin-sdk/pricing";

export class PricingClient implements PricingApiClient {
  private readonly broker: BrokerLike;

  constructor(broker: BrokerLike) {
    this.broker = broker;
  }

  /** @inheritdoc */
  async getProjectDiscounts(): Promise<Discount[]> {
    const data = (await this.broker.call(
      "pricing.getProjectDiscounts"
    )) as GetAllDiscountsResponse;
    return data.discounts ?? [];
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
