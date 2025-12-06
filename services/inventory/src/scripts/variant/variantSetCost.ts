import type { TransactionScript } from "../../kernel/types.js";
import type { ProductVariantCostHistory } from "../../repositories/models/index.js";

type Currency = "UAH" | "USD" | "EUR";

const VALID_CURRENCIES: Currency[] = ["UAH", "USD", "EUR"];

export interface VariantSetCostParams {
  readonly variantId: string;
  readonly currency: string;
  readonly unitCostMinor: number;
}

export interface VariantSetCostResult {
  cost?: ProductVariantCostHistory;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const variantSetCost: TransactionScript<
  VariantSetCostParams,
  VariantSetCostResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { variantId, currency, unitCostMinor } = params;

    // 1. Validate currency
    if (!VALID_CURRENCIES.includes(currency as Currency)) {
      return {
        cost: undefined,
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
        cost: undefined,
        userErrors: [
          {
            message: "Variant not found",
            field: ["variantId"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 3. Validate unitCostMinor is non-negative
    if (unitCostMinor < 0) {
      return {
        cost: undefined,
        userErrors: [
          {
            message: "Cost must be a non-negative value",
            field: ["unitCostMinor"],
            code: "INVALID_COST",
          },
        ],
      };
    }

    // 4. Set cost (temporal pattern: close current, create new)
    const cost = await repository.cost.setCost(variantId, {
      currency: currency as Currency,
      unitCostMinor,
    });

    logger.info({ variantId, currency, unitCostMinor }, "Variant cost set successfully");

    return {
      cost,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "variantSetCost failed");
    return {
      cost: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
