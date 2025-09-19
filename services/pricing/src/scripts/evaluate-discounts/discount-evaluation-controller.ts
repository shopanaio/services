import type { EvaluateDiscountsResult, KernelServices } from "./types.js";
import type { EvaluateDiscountsParamsDto } from "./dto.js";
import { DISCOUNT_CONSTANTS } from "./types.js";
import { validateParams } from "./validation.js";
import { CartCalculator } from "./cart-calculator.js";
import { DiscountValidator } from "./discount-validator.js";

/**
 * Main discount evaluation controller
 */
export class DiscountEvaluationController {
  /**
   * Executes full discount evaluation process for cart
   *
   * @param params - Discount evaluation parameters
   * @param services - Kernel services (pluginManager, slotsClient, logger)
   * @returns Discount evaluation result
   * @throws {Error} On incorrect input data with detailed validation messages
   */
  static async evaluate(
    params: EvaluateDiscountsParamsDto,
    services: KernelServices
  ): Promise<EvaluateDiscountsResult> {
    try {
      // Validate input data through DTO and class-validator
      const validatedParams = validateParams(params);

      const { lines, appliedDiscountCodes = [] } = validatedParams;

      // Calculate total cart amount
      const totalAmount = CartCalculator.calculateTotal(lines);

      // Validate discounts through getAllDiscounts - gets all available discounts
      const validDiscounts = await DiscountValidator.validateDiscounts(
        appliedDiscountCodes,
        totalAmount,
        services,
        validatedParams
      );

      return {
        checkoutDiscounts: validDiscounts,
        lineDiscounts: {}, // item-level discounts not supported yet
      };
    } catch (error) {
      services.logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          params,
        },
        "Failed to evaluate discounts"
      );

      // Re-throw validation errors up for handling by calling code
      if (
        error instanceof Error &&
        error.message.includes("Validation failed")
      ) {
        throw error;
      }

      // Return empty result for unexpected errors
      return DISCOUNT_CONSTANTS.EMPTY_RESULT;
    }
  }
}
