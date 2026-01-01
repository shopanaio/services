import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { ItemPricing } from "../../repositories/models/index.js";

type Currency = "UAH" | "USD" | "EUR";

const VALID_CURRENCIES: Currency[] = ["UAH", "USD", "EUR"];

export interface VariantSetPricingParams {
  readonly variantId: string;
  readonly currency: string;
  readonly amountMinor: number;
  readonly compareAtMinor?: number | null;
}

export interface VariantSetPricingResult {
  price?: ItemPricing;
  userErrors: UserError[];
}

export class VariantSetPricingScript extends BaseScript<VariantSetPricingParams, VariantSetPricingResult> {
  protected async execute(params: VariantSetPricingParams): Promise<VariantSetPricingResult> {
    const { variantId, currency, amountMinor, compareAtMinor } = params;

    if (!VALID_CURRENCIES.includes(currency as Currency)) {
      return {
        price: undefined,
        userErrors: [{ message: `Invalid currency: ${currency}. Must be one of: ${VALID_CURRENCIES.join(", ")}`, field: ["currency"], code: "INVALID_CURRENCY" }],
      };
    }

    const variantExists = await this.repository.variant.exists(variantId);
    if (!variantExists) {
      return {
        price: undefined,
        userErrors: [{ message: "Variant not found", field: ["variantId"], code: "NOT_FOUND" }],
      };
    }

    if (amountMinor < 0) {
      return {
        price: undefined,
        userErrors: [{ message: "Price amount must be a non-negative value", field: ["amountMinor"], code: "INVALID_AMOUNT" }],
      };
    }

    if (compareAtMinor !== undefined && compareAtMinor !== null && compareAtMinor < 0) {
      return {
        price: undefined,
        userErrors: [{ message: "Compare at price must be a non-negative value", field: ["compareAtMinor"], code: "INVALID_COMPARE_AT" }],
      };
    }

    const price = await this.repository.pricing.setPrice(variantId, {
      currency: currency as Currency,
      amountMinor,
      compareAtMinor: compareAtMinor ?? null,
    });

    this.logger.info({ variantId, currency, amountMinor }, "Variant pricing set successfully");

    return { price, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetPricingResult {
    return {
      price: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
