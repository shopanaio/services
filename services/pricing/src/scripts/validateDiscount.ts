import type { TransactionScript } from "@shopana/shared-kernel";
import type { Discount } from "@shopana/plugin-sdk/pricing";
import { getAllDiscounts } from "./getAllDiscounts.js";

// Parameters for discount validation
export interface ValidateDiscountParams {
  readonly code: string;
  readonly provider?: string;
  readonly projectId: string;
  readonly checkoutId?: string;
  readonly requestId?: string;
  readonly userAgent?: string;
}

// Validation result
export interface ValidateDiscountResult {
  valid: boolean;
  code: string;
  discount?: Discount;
  provider?: string;
}

/**
 * Transaction Script: Validation of specific discount through plugins
 */
export const validateDiscount: TransactionScript<
  ValidateDiscountParams,
  ValidateDiscountResult
> = async (params, services) => {
  const { code, projectId, checkoutId } = params;
  const { logger } = services;

  try {
    const { discounts } = await getAllDiscounts({ projectId }, services);

    // Search for the required discount by code among all available
    const normalizedCode = code.trim().toLowerCase();
    const codeMatches = discounts
      .filter((d) => d.code.trim().toLowerCase() === normalizedCode)
      .at(0);

    // If nothing found by code and provider is not explicitly set - no configuration for validation
    if (!codeMatches) {
      throw new Error("No discount configuration found");
    }

    return {
      code: codeMatches.code,
      valid: true,
      discount: codeMatches,
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        code,
        checkoutId,
      },
      "Discount validation failed"
    );

    return {
      valid: false,
      code,
      errors: ["Internal validation error"],
    };
  }
};
