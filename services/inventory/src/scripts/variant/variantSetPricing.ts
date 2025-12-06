import type { TransactionScript } from "../../kernel/types.js";
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
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetPricing: TransactionScript<
  VariantSetPricingParams,
  VariantSetPricingResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { variantId, currency, amountMinor, compareAtMinor } = params;

    // 1. Validate currency
    if (!VALID_CURRENCIES.includes(currency as Currency)) {
      return {
        price: undefined,
        userErrors: [
          {
            message: `Invalid currency: ${currency}. Must be one of: ${VALID_CURRENCIES.join(", ")}`,
            field: ["currency"],
            code: "INVALID_CURRENCY",
          },
        ],
      };
    }

    // 2. Check if variant exists
    const variantExists = await repository.variant.exists(variantId);
    if (!variantExists) {
      return {
        price: undefined,
        userErrors: [
          {
            message: "Variant not found",
            field: ["variantId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 3. Validate amountMinor is non-negative
    if (amountMinor < 0) {
      return {
        price: undefined,
        userErrors: [
          {
            message: "Price amount must be a non-negative value",
            field: ["amountMinor"],
            code: "INVALID_AMOUNT",
          },
        ],
      };
    }

    // 4. Validate compareAtMinor is non-negative if provided
    if (compareAtMinor !== undefined && compareAtMinor !== null && compareAtMinor < 0) {
      return {
        price: undefined,
        userErrors: [
          {
            message: "Compare at price must be a non-negative value",
            field: ["compareAtMinor"],
            code: "INVALID_COMPARE_AT",
          },
        ],
      };
    }

    // 5. Set price (temporal pattern: close current, create new)
    const price = await repository.pricing.setPrice(variantId, {
      currency: currency as Currency,
      amountMinor,
      compareAtMinor: compareAtMinor ?? null,
    });

    logger.info({ variantId, currency, amountMinor }, "Variant pricing set successfully");

    return {
      price,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantSetPricing failed");
    return {
      price: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
