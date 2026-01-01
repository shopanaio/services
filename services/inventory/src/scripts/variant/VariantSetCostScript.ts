import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
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
  userErrors: UserError[];
}

export class VariantSetCostScript extends BaseScript<VariantSetCostParams, VariantSetCostResult> {
  protected async execute(params: VariantSetCostParams): Promise<VariantSetCostResult> {
    const { variantId, currency, unitCostMinor } = params;

    if (!VALID_CURRENCIES.includes(currency as Currency)) {
      return {
        cost: undefined,
        userErrors: [{ message: `Invalid currency: ${currency}. Must be one of: ${VALID_CURRENCIES.join(", ")}`, field: ["currency"], code: "INVALID_CURRENCY" }],
      };
    }

    const variantExists = await this.repository.variant.exists(variantId);
    if (!variantExists) {
      return {
        cost: undefined,
        userErrors: [{ message: "Variant not found", field: ["variantId"], code: "NOT_FOUND" }],
      };
    }

    if (unitCostMinor < 0) {
      return {
        cost: undefined,
        userErrors: [{ message: "Cost must be a non-negative value", field: ["unitCostMinor"], code: "INVALID_COST" }],
      };
    }

    const cost = await this.repository.cost.setCost(variantId, {
      currency: currency as Currency,
      unitCostMinor,
    });

    this.logger.info({ variantId, currency, unitCostMinor }, "Variant cost set successfully");

    return { cost, userErrors: [] };
  }

  protected handleError(_error: unknown): VariantSetCostResult {
    return {
      cost: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
