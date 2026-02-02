import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { ItemPricing } from "../../repositories/models/index.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
  singleError,
} from "../types/ScriptResult.js";
import type { PricingChanges } from "../types/ProductChanges.js";

type Currency = "UAH" | "USD" | "EUR";

const VALID_CURRENCIES: Currency[] = ["UAH", "USD", "EUR"];

export interface VariantUpdatePricingParams {
  readonly variantId: string;
  readonly currency: string;
  readonly amountMinor: number;
  readonly compareAtMinor?: number | null;
}

export type VariantUpdatePricingResult = ScriptResult<ItemPricing, PricingChanges>;

/**
 * Script for updating variant pricing (price and compare-at).
 */
export class VariantUpdatePricingScript extends BaseScript<
  VariantUpdatePricingParams,
  VariantUpdatePricingResult
> {
  protected async execute(
    params: VariantUpdatePricingParams
  ): Promise<VariantUpdatePricingResult> {
    const { variantId, currency, amountMinor, compareAtMinor } = params;

    // Validate currency
    if (!VALID_CURRENCIES.includes(currency as Currency)) {
      return singleError(
        `Invalid currency: ${currency}. Must be one of: ${VALID_CURRENCIES.join(", ")}`,
        "INVALID_CURRENCY",
        ["currency"]
      );
    }

    // Validate variant exists
    const variantExists = await this.repository.variant.exists(variantId);
    if (!variantExists) {
      return singleError("Variant not found", "NOT_FOUND", ["variantId"]);
    }

    // Validate amounts
    if (amountMinor < 0) {
      return singleError(
        "Price amount must be a non-negative value",
        "INVALID_AMOUNT",
        ["amountMinor"]
      );
    }

    if (
      compareAtMinor !== undefined &&
      compareAtMinor !== null &&
      compareAtMinor < 0
    ) {
      return singleError(
        "Compare at price must be a non-negative value",
        "INVALID_COMPARE_AT",
        ["compareAtMinor"]
      );
    }

    const typedCurrency = currency as Currency;

    // Get current pricing to compare
    const currentPricing = await this.repository.pricing.getCurrentPrice({
      variantId,
      currency: typedCurrency,
    });

    // Determine what changed
    const priceChanged =
      !currentPricing ||
      currentPricing.amountMinor !== amountMinor ||
      currentPricing.compareAtMinor !== (compareAtMinor ?? null);

    // If nothing changed, return early
    if (!priceChanged) {
      this.logger.debug({ variantId }, "No pricing changes detected");
      return unchangedResult(currentPricing!);
    }

    // Update price
    const price = await this.repository.pricing.setPrice(variantId, {
      currency: typedCurrency,
      amountMinor,
      compareAtMinor: compareAtMinor ?? null,
    });

    // Build changes object
    const changes: PricingChanges = {
      currency,
      amount: amountMinor,
    };

    if (compareAtMinor !== undefined) {
      changes.compareAt = compareAtMinor;
    }

    this.logger.info(
      { variantId, currency, amountMinor },
      "Variant pricing updated successfully"
    );

    return successResult(price, changes);
  }

  protected handleError(_error: unknown): VariantUpdatePricingResult {
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
